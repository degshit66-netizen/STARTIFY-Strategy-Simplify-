const fs = require('fs');
let code = fs.readFileSync('src/lib/db.ts', 'utf8');

if (!code.includes('deleteUserFromFirebase')) {
  // We need to import deleteDoc if not already imported
  if (!code.includes('deleteDoc')) {
    code = code.replace(/setDoc, getDoc, getDocs, collection/g, 'setDoc, getDoc, getDocs, collection, deleteDoc');
  }

  const deleteFunc = `
export const deleteUserFromFirebase = async (userId: string) => {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (e) {
    console.error('Error deleting user:', e);
  }
};
`;

  code = code.replace(/export const loadTenantsFromFirebase/, deleteFunc + '\nexport const loadTenantsFromFirebase');
  fs.writeFileSync('src/lib/db.ts', code);
}
