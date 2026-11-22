/* SKEBOB — Supabase accounts and cloud progress. Wallet is never uploaded by client. */
(function(){
"use strict";
const URL="https://ycfxzesdzilywqqeevpz.supabase.co";
const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnh6ZXNkemlseXdxcWVldnB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzMDk3OTUsImV4cCI6MjExMDg4NTc5NX0.SOPuogHEyJVku-C41lNnzrXB6meGxlD_QIgf-NrAfvA";
const AUTH=URL+"/functions/v1/skebob-auth", AK="skebobAccessToken", RK="skebobRefreshToken", UK="skebobAccount";
let session=null,busy=false;
async function call(mode,body,access){
 const res=await fetch(AUTH,{method:"POST",headers:{"Content-Type":"application/json","apikey":KEY,...(access?{Authorization:"Bearer "+access}:{})},body:JSON.stringify({mode,...body})});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(data.error||"Ошибка соединения");return data;
}
function saveSession(d){session=d.session;localStorage.setItem(AK,session.access_token);localStorage.setItem(RK,session.refresh_token);localStorage.setItem(UK,JSON.stringify({id:d.user.id,username:d.user.user_metadata?.username||""}));window.skebobAccount=d.user;}
function token(){return session?.access_token||localStorage.getItem(AK)||"";}
async function refresh(){const rt=localStorage.getItem(RK);if(!rt)return false;try{saveSession(await call("refresh",{refresh_token:rt}));return true;}catch(_){[AK,RK,UK].forEach(k=>localStorage.removeItem(k));return false;}}
async function authCall(mode,body){try{return await call(mode,body,token());}catch(e){if(!(await refresh()))throw e;return await call(mode,body,token());}}
function showAuth(){
 if(document.getElementById("skebobAuthOverlay"))return;
 const o=document.createElement("div");o.id="skebobAuthOverlay";o.style.cssText="position:fixed;inset:0;z-index:50000;background:rgba(4,5,12,.95);display:flex;align-items:center;justify-content:center;padding:18px";
 o.innerHTML='<section style="width:100%;max-width:420px;background:var(--panel,#191a20);color:var(--text,#fff);border:1px solid var(--gold,#f4c75e);border-radius:20px;padding:22px"><div style="font-size:25px;font-weight:900;color:var(--gold)">SKEBOB CASINO</div><p style="font-size:13px;color:var(--muted)">Игровые Stars — виртуальные очки без денежной стоимости и вывода.</p><div style="display:flex;gap:8px;margin:14px 0"><button id="skLoginTab" type="button" style="flex:1;padding:11px">ВХОД</button><button id="skSignupTab" type="button" style="flex:1;padding:11px">РЕГИСТРАЦИЯ</button></div><label>USERNAME</label><input id="skUsername" maxlength="20" autocomplete="username" autocapitalize="none" placeholder="player_123" style="width:100%;padding:13px;margin:6px 0;background:var(--input);color:var(--text);border:1px solid var(--border2);border-radius:10px"><label>ПАРОЛЬ</label><input id="skPassword" type="password" maxlength="72" autocomplete="current-password" placeholder="Минимум 8 символов" style="width:100%;padding:13px;margin:6px 0;background:var(--input);color:var(--text);border:1px solid var(--border2);border-radius:10px"><button id="skAuthSubmit" type="button" style="width:100%;padding:14px;margin-top:12px;background:linear-gradient(135deg,#f4c75e,#ffae19);border:0;border-radius:11px;font-weight:900">ВОЙТИ</button><div id="skAuthStatus" role="status" style="min-height:22px;margin-top:12px;font-size:13px;color:var(--muted)"></div></section>';
 document.body.appendChild(o);
 let mode="login";const login=o.querySelector("#skLoginTab"),signup=o.querySelector("#skSignupTab"),submit=o.querySelector("#skAuthSubmit"),status=o.querySelector("#skAuthStatus");
 function setMode(m){mode=m;login.style.background=m==="login"?"#493819":"var(--panel2)";signup.style.background=m==="signup"?"#493819":"var(--panel2)";submit.textContent=m==="login"?"ВОЙТИ":"СОЗДАТЬ АККАУНТ";o.querySelector("#skPassword").autocomplete=m==="login"?"current-password":"new-password";}
 login.onclick=()=>setMode("login");signup.onclick=()=>setMode("signup");
 async function go(){if(busy)return;const username=o.querySelector("#skUsername").value.trim().toLowerCase(),password=o.querySelector("#skPassword").value;if(!/^[a-z0-9_]{3,20}$/.test(username)){status.textContent="Username: 3–20 латинских букв, цифр или _.";return;}if(password.length<8||password.length>72){status.textContent="Пароль должен быть от 8 до 72 символов.";return;}busy=true;submit.disabled=true;submit.textContent="ПОДОЖДИ…";try{saveSession(await call(mode,{username,password}));o.remove();await bootstrap();window.dispatchEvent(new CustomEvent("skebob-auth-ready"));}catch(e){status.textContent=e.message;}finally{busy=false;if(submit.isConnected){submit.disabled=false;setMode(mode);}}}
 submit.onclick=go;o.querySelector("#skPassword").addEventListener("keydown",e=>{if(e.key==="Enter")go();});setMode("login");
}
async function bootstrap(){
 const d=await authCall("load",{});
 if(typeof state!=="undefined"&&state){const balance=Math.max(0,Number(d.balance)||0);if(d.save&&typeof d.save==="object"){const safe={...d.save};delete safe.balance;delete safe.balance_stars;delete safe.wallet;Object.assign(state,safe);}state.balance=balance;if(typeof render==="function")render();}
 const username=d.username||window.skebobAccount?.user_metadata?.username||"Player";localStorage.setItem("skebobNickname",username);if(typeof updateNicknameUI==="function")updateNicknameUI();return d;
}
window.initSupabaseAuth=async function(){if(!token()&&!(await refresh())){showAuth();return;}try{await bootstrap();window.dispatchEvent(new CustomEvent("skebob-auth-ready"));}catch(e){console.error("SKEBOB auth:",e);showAuth();}};
window.skebobQueueSave=async function(){if(!token()||typeof state==="undefined"||!state)return;const safe={...state};delete safe.balance;delete safe.balance_stars;delete safe.wallet;try{await authCall("save",{save:safe});}catch(e){console.warn("Cloud save:",e);}};
window.skebobChangeNickname=async function(){throw new Error("Смена username пока не подключена.");};
window.persistNickname=()=>true;
window.getNickname=function(){try{return JSON.parse(localStorage.getItem(UK)||"{}").username||localStorage.getItem("skebobNickname")||"Player";}catch(_){return localStorage.getItem("skebobNickname")||"Player";}};
window.skebobGetLeaderboard=async function(){const d=await authCall("leaderboard",{});return d.players||[];};
window.skebobGetMyBadge=async()=>null;window.skebobShowPendingGlobalAnnouncements=async()=>{};window.skebobShowPendingNotifications=async()=>{};window.skebobTrackGameLaunch=async()=>false;
window.skebobCreateStarsInvoice=async()=>{throw new Error("Пополнения отключены: только игровые Stars.");};window.skebobRefreshAfterStarsPayment=async()=>false;
window.skebobLogout=async function(){[AK,RK,UK].forEach(k=>localStorage.removeItem(k));session=null;location.reload();};
const disabled=async()=>{throw new Error("Эта функция пока не подключена к серверу.");};
for(const n of ["skebobResetPlayerProgress","skebobGrantMoney","skebobLookupPlayer","skebobGetGameStatistics","skebobGetPopularGames","skebobSetPlayerBadge","skebobRemovePlayerBadge","skebobBanPlayer","skebobUnbanPlayer","skebobSendPlayerNotification","skebobPublishGlobalAnnouncement","skebobGetAllPlayerAccounts","skebobChangePassword"])window[n]=disabled;
})();