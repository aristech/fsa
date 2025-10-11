console.log('Starting import test...');

console.log('1. Config...');
import('./config').then(() => console.log('✅ Config loaded')).catch(e => console.error('❌ Config failed:', e));

console.log('2. Database utils...');
import('./utils/database').then(() => console.log('✅ Database utils loaded')).catch(e => console.error('❌ Database utils failed:', e));

console.log('3. Realtime service...');
import('./services/realtime-service').then(() => console.log('✅ Realtime service loaded')).catch(e => console.error('❌ Realtime service failed:', e));

console.log('4. Routes...');
import('./routes/index').then(() => console.log('✅ Routes loaded')).catch(e => console.error('❌ Routes failed:', e));

console.log('5. Superuser bootstrap...');
import('./services/superuser-bootstrap').then(() => console.log('✅ Superuser bootstrap loaded')).catch(e => console.error('❌ Superuser bootstrap failed:', e));

console.log('6. Index maintenance...');
import('./services/index-maintenance').then(() => console.log('✅ Index maintenance loaded')).catch(e => console.error('❌ Index maintenance failed:', e));

console.log('7. Task migration...');
import('./services/task-migration').then(() => console.log('✅ Task migration loaded')).catch(e => console.error('❌ Task migration failed:', e));

console.log('All import requests sent...');

setTimeout(() => {
  console.log('Test complete');
  process.exit(0);
}, 5000);
