const assert=require('node:assert/strict'),command=require('../command-engine.js');
const db={projects:[{id:1,name:'ارشام',aliases:['آرشام']}],people:[{id:5,name:'ح'},{id:6,name:'محم'},{id:10,name:'اوسا احمد بنا',aliases:['اوسا احمد','استاد احمد','اوستا احمد']},{id:11,name:'اوسا احمد'}]};
for(const name of ['استاد احمد','اوسا احمد بنا']){const p=command.parse(`صد میلیون تومان به ${name} در پروژه آرشام به صورت چک پرداخت شد`,db,'1405/07/15');assert.equal(p.party,'اوسا احمد بنا',JSON.stringify(p))}
console.log('PASS: partial person names cannot capture a cheque for existing contractor');
