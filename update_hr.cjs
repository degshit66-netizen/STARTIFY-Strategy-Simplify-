const fs = require('fs');
let content = fs.readFileSync('src/components/HRModule.tsx', 'utf8');

content = content.replace(
`  const deleteEmployee = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    const updated = employees.filter(emp => emp.id !== id);
    saveEmployees(updated);
    showToast('Employee record archived.', 'success');
  };`,
`  const deleteEmployee = (id: string) => {
    // Replaced window.confirm since it breaks in iframes
    const updated = employees.filter(emp => emp.id !== id);
    saveEmployees(updated);
    showToast('Employee record archived.', 'success');
  };`
);

content = content.replace(
`                          <button
                            onClick={() => {
                              if (confirm('Delete this record?')) {
                                const updated = timeLogs.filter(t => t.id !== log.id);
                                setTimeLogs(updated);
                                localStorage.setItem(TIME_KEY, JSON.stringify(updated));
                                showToast('Record deleted.', 'info');
                              }
                            }}
                            className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors"
                          >`,
`                          <button
                            onClick={() => {
                              const updated = timeLogs.filter(t => t.id !== log.id);
                              setTimeLogs(updated);
                              localStorage.setItem(TIME_KEY, JSON.stringify(updated));
                              showToast('Record deleted.', 'info');
                            }}
                            className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors"
                          >`
);

fs.writeFileSync('src/components/HRModule.tsx', content);
console.log('updated HRModule.tsx');
