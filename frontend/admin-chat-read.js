(function(root){
  function createReadState(storage, account){
    const key='essenAdminChatRead:'+account;
    let read={};
    try{const value=JSON.parse(storage.getItem(key)||'{}');if(value && typeof value==='object' && !Array.isArray(value))read=value;}catch{}
    return {
      isUnread(session){const latest=session.messages?.[0];return latest?.sender==='user' && latest.id > (Number(read[session.id])||0);},
      markRead(session){const latest=Math.max(0,...session.messages.map(message=>Number(message.id)||0));read[session.id]=Math.max(Number(read[session.id])||0,latest);try{storage.setItem(key,JSON.stringify(read));}catch{}}
    };
  }
  if(typeof module!=='undefined' && module.exports)module.exports=createReadState;
  else root.createAdminChatReadState=createReadState;
})(typeof window!=='undefined'?window:globalThis);
