const {test}=require('node:test');const assert=require('node:assert/strict');
const create=require('../../frontend/admin-chat-read');
test('admin unread survives logout and reload, and clears only after reading',()=>{
 const values=new Map();const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 const session={id:3,messages:[{id:10,sender:'user'}]};
 let state=create(storage,'admin1');assert.equal(state.isUnread(session),true);
 state=create(storage,'admin1');assert.equal(state.isUnread(session),true);
 state.markRead(session);state=create(storage,'admin1');assert.equal(state.isUnread(session),false);
 session.messages=[{id:11,sender:'user'}];state=create(storage,'admin1');assert.equal(state.isUnread(session),true);
 state.markRead(session);assert.equal(create(storage,'admin1').isUnread(session),false);
 assert.equal(create(storage,'admin2').isUnread(session),true);
 assert.equal(state.isUnread({id:5,messages:[]}),false);
 assert.equal(state.isUnread({id:5,messages:[{id:12,sender:'admin'}]}),false);
});
