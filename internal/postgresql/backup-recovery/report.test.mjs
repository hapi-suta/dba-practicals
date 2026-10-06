import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderReport,validateInventory} from './class-report.mjs';
const good={name:'Learner A',host:'192.0.2.10',identityFile:'/private/key',knownHostsFile:'/private/hosts'};
test('inventory rejects commands, unknown fields and relative secret paths',()=>{
 assert.equal(validateInventory([good]).length,1);
 for(const patch of [{host:'x;id'},{host:'-oProxyCommand=id'},{password:'secret'},{identityFile:'relative'},{name:''}])assert.throws(()=>validateInventory([{...good,...patch}]));
});
test('dashboard escapes learner data and shows unknown rather than success',()=>{
 const html=renderReport([{name:'<script>alert(1)</script>',error:'Stopped & unavailable'},{name:'A',checks:[{id:'file',status:'PRESENT',detail:'Presence only'}]}],'synthetic-test');
 assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);assert.match(html,/UNKNOWN/);assert.match(html,/Presence only/);assert.match(html,/not live monitoring/);
});
