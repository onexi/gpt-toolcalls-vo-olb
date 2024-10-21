import { appendFile } from 'fs/promises';
import { join } from 'path';
import fs from 'fs';

// Function to compare two strings; Return true if the strings have at least 30% of words in common
function strComp(s1, s2) {
    const words1 = s1.toLowerCase().split(/\s+|[.,!?;:-_()]+/).filter(Boolean);
    const words2 = s2.toLowerCase().split(/\s+|[.,!?;:-_()]+/).filter(Boolean);
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    return intersection.size / Math.min(set1.size, set2.size) >= 0.3;
}

// Added a 'delete' action
// Updated function for fuzzy matching in 'get' and 'delete' actions
// Added timestamp to the stored memory
const execute = async (action, key, memory) => {
    
    const filePath = join(process.cwd(), './functions/memories.csv');
    
        // Prepare the text as a CSV entry (with escaping of quotes)
        //const csvEntry = `"${memory.replace(/"/g, '""')}"\n`;

    try {
        if (action === 'set') {
            var timestamp = new Date().toLocaleString().replace(/,/g, '');
            await appendFile(filePath, `${key}, ${memory}, ${timestamp}\n`);
            console.log('Memory stored!'+ memory);
            return [{ [key]: memory , "timestamp": timestamp }];
        } else if (action == 'get') {
            const data = await fs.promises.readFile(filePath, 'utf8').then(content => content.trim());
            const lines = data.split('\n');
            const results = [];
            for (const line of lines) {
                const [storedKey, storedMemory, timestamp] = line.split(',');
                if ( strComp(storedKey, key) || strComp(storedMemory, key) ) {
                    results.push({ [storedKey]: storedMemory, "timestamp": timestamp });
                }
            }
            return results;
        } else if (action == 'getall') {
            const data = await fs.promises.readFile(filePath, 'utf8').then(content => content.trim());
            const memories = data.split('\n')
                .map((line) => {
                    const   [storedKey, storedMemory, timestamp] = line.split(',');
                    return { [storedKey]: storedMemory, "timestamp": timestamp };
                });
    
            return memories;
        } else if (action == 'delete') {
            const data = await fs.promises.readFile(filePath, 'utf8').then(content => content.trim());
            const lines = data.split('\n');
            const updatedLines = lines.filter(line => {
                const [storedKey, storedMemory, timestamp] = line.split(',');
                return ( strComp(storedKey, key) || strComp(storedMemory, key) ) ? false : true;
            });
            
            await fs.promises.writeFile(filePath, updatedLines.join('\n') + '\n');
            return { [key]: 'Deleted' };
        }
    } catch (err) {
        console.error('Error writing to the file:', err);
    }
    return `Memory Not stored! ${key}: ${memory}`;
}
    
const details = {
    "type": "function",
    function:{
    "name": "scratchpad",
    "parameters": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "description": "The action is one of 'set', 'get', 'getall' or 'delete'. Use 'set' to store a given memory for a given key, 'get' to retrieve a memory from a saved file for a given key, 'getall' to retrieve all memories from saved file, 'delete' to remove a memory from a saved file for a given key"
            },
            "key": {
                "type": "string",
                "description": "The key to search for in the memory file"
            },
            "memory": {
                "type": "string",
                "description": "The text to store"
            }
        },
        "required": ["action", "key", "memory"]
    },
},
    "description": "This function stores, retrieves, and manages key-value memories with memory-created timestamp recorded, useful for LLM recalling information across sessions."
};
export { execute, details };