// Twitch Helix API proxy. Node.js 20+; no dependencies.
const http = require('node:http');
const { URLSearchParams } = require('node:url');
const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const PORT = Number(process.env.PORT || 3200);
let token = '', expires = 0, cache = null, cacheUntil = 0;
async function getToken() {
  if (token && Date.now() < expires) return token;
  const r = await fetch('https://id.twitch.tv/oauth2/token', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({client_id:CLIENT_ID,client_secret:CLIENT_SECRET,grant_type:'client_credentials'})
  });
  if (!r.ok) throw new Error('Twitch token request failed: '+r.status);
  const d=await r.json();token=d.access_token;expires=Date.now()+(d.expires_in-120)*1000;return token;
}
async function helix(path) {
  const r=await fetch('https://api.twitch.tv/helix/'+path,{headers:{'Client-ID':CLIENT_ID,'Authorization':'Bearer '+await getToken()}});
  if(!r.ok)throw new Error('Twitch Helix error: '+r.status);
  return (await r.json()).data || [];
}
async function status() {
  if(cache && Date.now()<cacheUntil)return cache;
  const [users,streams]=await Promise.all([helix('users?login=casualdisaster9696'),helix('streams?user_login=casualdisaster9696')]);
  const u=users[0]||{},st=streams[0];
  cache={live:!!st,avatar:u.profile_image_url||'',description:u.description||'',title:st?.title||'',game:st?.game_name||'',viewers:st?.viewer_count||0};
  cacheUntil=Date.now()+60000;return cache;
}
http.createServer(async(req,res)=>{
  if(req.url!=='/api/twitch/status'){res.writeHead(404);return res.end('Not found');}
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','public, max-age=30');
  if(!CLIENT_ID||!CLIENT_SECRET){res.writeHead(503);return res.end(JSON.stringify({error:'Twitch credentials not configured'}));}
  try{res.end(JSON.stringify(await status()));}catch(err){console.error(err.message);res.writeHead(502);res.end(JSON.stringify({error:'Twitch API unavailable'}));}
}).listen(PORT,'127.0.0.1',()=>console.log('Twitch status API listening on 127.0.0.1:'+PORT));
