import { db } from './src/lib/firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';

async function test() {
  try {
    const userId = 'u-test-' + Date.now();
    await setDoc(doc(db, 'users', userId), { id: userId, email: 'test@example.com', role: 'tenant_owner' });
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users = querySnapshot.docs.map(d => d.data());
    const found = users.find(u => u.id === userId);
    console.log("Successfully retrieved immediately?", !!found);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
test();
