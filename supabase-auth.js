/* SKEBOB GAME — автономный режим без Supabase и серверной синхронизации.
 * Игровые данные сохраняются только в localStorage текущего браузера.
 */
(function(){
 "use strict";
 const NICK_KEY="skebobNickname";
 const unavailable=async function(){throw new Error("Эта функция отключена в автономном режиме.");};
 window.initSupabaseAuth=function(){if(typeof window.initNickname==="function")window.initNickname();};
 window.skebobQueueSave=function(){try{if(typeof state!=="undefined")localStorage.setItem("skebobSave",JSON.stringify(state));}catch(e){console.warn("Local save:",e);}};
 window.skebobChangeNickname=async function(value){
  const nick=String(value||"").trim().replace(/\\s+/g," ").slice(0,18);
  if(nick.length<2)throw new Error("Ник должен содержать от 2 до 18 символов.");
  localStorage.setItem(NICK_KEY,nick);
  if(typeof updateNicknameUI==="function")updateNicknameUI();
  if(typeof renderProfile==="function")renderProfile();
  if(typeof save==="function")save();
  return true;
 };
 window.persistNickname=function(value){if(value)localStorage.setItem(NICK_KEY,String(value).slice(0,18));return true;};
 window.getNickname=function(){return localStorage.getItem(NICK_KEY)||"Player";};
 window.refreshMyPlayerBadge=async function(){window.currentPlayerBadgeHtml="";};
 window.skebobShowPendingGlobalAnnouncements=async function(){};
 window.skebobShowPendingNotifications=async function(){};
 window.skebobGetLeaderboard=async function(){return [];};
 window.skebobGetMyBadge=async function(){return null;};
 window.skebobTrackGameLaunch=async function(){return false;};
 window.skebobCreateStarsInvoice=unavailable;
 window.skebobRefreshAfterStarsPayment=unavailable;
 for(const name of ["skebobResetPlayerProgress","skebobGrantMoney","skebobLookupPlayer","skebobGetGameStatistics","skebobGetPopularGames","skebobSetPlayerBadge","skebobRemovePlayerBadge","skebobBanPlayer","skebobUnbanPlayer","skebobSendPlayerNotification","skebobPublishGlobalAnnouncement","skebobGetAllPlayerAccounts","skebobChangePassword","skebobLogout"]){window[name]=unavailable;}
})();
