// Add a .env file with OPENAI_API_KEY in the directory where this file is located and add the following lines:
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';
import { OpenAI} from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from "fs";

// Initialize Express server
const app = express();
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.resolve(process.cwd(), './public')));

// OpenAI API configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
let state = {
    chatgpt:false,
    assistant_id: "",
    assistant_name: "",
    dir_path: "",
    news_path: "",
    thread_id: "",
    user_message: "",
    run_id: "",
    run_status: "",
    vector_store_id: "",
    tools:[],
    parameters: []
  };
// Default route to serve index.html for any undefined routes
app.get('*', (req, res) => {
    res.sendFile(path.resolve(process.cwd(), './public/index.html'));
});
async function getFunctions() {
   
    const files = fs.readdirSync(path.resolve(process.cwd(), "./functions"));
    const openAIFunctions = {};

    for (const file of files) {
        if (file.endsWith(".js")) {
            const moduleName = file.slice(0, -3);
            const modulePath = `./functions/${moduleName}.js`;
            const { details, execute } = await import(modulePath);

            openAIFunctions[moduleName] = {
                "details": details,
                "execute": execute
            };
        }
    }
    return openAIFunctions;
}

// Route to interact with OpenAI API
app.post('/api/execute-function', async (req, res) => {
    const { functionName, parameters } = req.body;

    // Import all functions
    const functions = await getFunctions();

    if (!functions[functionName]) {
        return res.status(404).json({ error: 'Function not found' });
    }

    try {
        // Call the function
        const result = await functions[functionName].execute(...Object.values(parameters));
        console.log(`result: ${JSON.stringify(result)}`);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Function execution failed', details: err.message });
    }
});

// Example to interact with OpenAI API and get function descriptions
app.post('/api/openai-call', async (req, res) => {
    const { user_message } = req.body;

    const functions = await getFunctions();
    const availableFunctions = Object.values(functions).map(fn => fn.details);
    console.log(`availableFunctions: ${JSON.stringify(availableFunctions)}\n`);
    let messages = [
        { role: 'system', content: 'You are a helpful assistant. You are able to call provided tools if needed, able to wisely call them step by step and properly reflect on what you have done and what needs doing at each stage if needed.' },
        { role: 'user', content: user_message }
    ];
    try {
        // Make OpenAI API call
        var response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            tools: availableFunctions
        });

        // Extract the function call result from the response
        var message = response.choices[0].message;
        messages.push(message); // system, user, assistant

        let allToolCalls = [];

        /*
         1. Demo of one function, one turn, multiple calls
            Prompt: Note down that Alice likes candy and that Bob likes chocolate.
            Function:   [
                            [
                                scratchpad(action: 'set', key: 'Alice', memory: 'likes candy'), 
                                scratchpad(action: 'set', key: 'Bob', memory: 'likes chocolate') 
                            ]
                        ]
         2. Demo of one function, multiple turns
            Prompt: Clear all memory.
            Function:   [
                            [
                                scratchpad(action: 'getall')
                            ],
                            [
                                scratchpad(action: 'delete', key: 'Alice'),
                                scratchpad(action: 'delete', key: 'Bob')
                            ]
                        ]
         3. Demo of multiple functions, multiple turns
            Prompt: What was noted in your memory within one hour before current time?
            Function:   [
                            [
                                getTime()
                            ],
                            [
                                scratchpad(action: 'getall')
                            ]
                        ]
        */

        // Keep pushing and fetching with LLM in turns if there are tool calls
        let maxIter = 10;
        while (message.tool_calls && message.tool_calls.length > 0 && maxIter > 0) {
            maxIter--;
            let toolCallsResults = [];
            // Allow to call multiple tools in a turn
            for (const toolCall of message.tool_calls) {
                const functionName = toolCall.function.name;
                const parameters = JSON.parse(toolCall.function.arguments);

                const result = await functions[functionName].execute(...Object.values(parameters));
                
                const function_call_result_message = {
                    role: "tool",
                    content: JSON.stringify({
                        result: result
                    }),
                    tool_call_id: toolCall.id
                };
                messages.push(function_call_result_message);// system, user, assistant, tool[...]
                toolCallsResults.push({ functionName: functionName, parameters: parameters, result: result });
            }
            allToolCalls.push(toolCallsResults);
            
            // Call the OpenAI API's chat completions endpoint to send the tool call result back to the model
            response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: messages,
                tools: availableFunctions
            });
            message = response.choices[0].message;
            messages.push(message); // system, user, assistant, tool[...], assistant
        }

        const res_json = { message: message.content, state: state, toolCall: allToolCalls };
        res.json(res_json);
        console.log(JSON.stringify(res_json, null, 2)+'\n');
    } catch (error) {
        res.status(500).json({ error: 'OpenAI API failed', details: error.message });
    }
});

app.post('/api/prompt', async (req, res) => {
    // just update the state with the new prompt
    state = req.body;
    try {
        res.status(200).json({ message: `got prompt ${state.user_message}`, "state": state });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'User Message Failed', "state": state });
    }
});
// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}\n`);
});
