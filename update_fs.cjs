const fs = require('fs');
let content = fs.readFileSync('src/components/FSModule.tsx', 'utf8');

content = content.replace(
`  const addEntity = () => {
    const name = prompt("Enter Entity Name (e.g., Subsidiary B):");
    if (name) {
      setEntities([...entities, { id: crypto.randomUUID(), name, balances: {} }]);
    }
  };

  const removeEntity = (id: string) => {
    if (confirm("Are you sure you want to remove this entity?")) {
      setEntities(entities.filter(e => e.id !== id));
    }
  };`,
`  const addEntity = (name: string) => {
    if (name.trim()) {
      setEntities([...entities, { id: crypto.randomUUID(), name: name.trim(), balances: {} }]);
    }
  };

  const removeEntity = (id: string) => {
    setEntities(entities.filter(e => e.id !== id));
  };`
);

content = content.replace(
`          <button 
            onClick={addEntity}
            className="text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3 h-3 rotate-180" />
            Add Subsidiary/Entity
          </button>`,
`          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Entity Name (e.g. Sub A)" 
              value={newEntityName}
              onChange={e => setNewEntityName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newEntityName.trim()) {
                  addEntity(newEntityName);
                  setNewEntityName('');
                }
              }}
              className="text-[10px] px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none text-zinc-800 dark:text-zinc-200 min-w-[150px]"
            />
            <button 
              onClick={() => {
                if (newEntityName.trim()) {
                  addEntity(newEntityName);
                  setNewEntityName('');
                }
              }}
              disabled={!newEntityName.trim()}
              className="text-[10px] font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3 h-3 rotate-180" />
              Add Entity
            </button>
          </div>`
);

fs.writeFileSync('src/components/FSModule.tsx', content);
console.log('updated FSModule.tsx');
