import { db, auth } from './src/lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function test() {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    console.log("Users:", querySnapshot.docs.map(d => d.data()));
  } catch (e) {
    console.error(e);
  }
}
test();
