[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/9wDnMTRl)
# FunctionAgents
Call Function from LLM

## L04 instructions

The `server.js` is modified so that:
 1. the communication between server and LLM can happen multiple times within one user prompt request; that is, after the server calls some functions with some parameters designated by LLM and pushes the results to the LLM, LLM can continue asking server to call some functions with some parameters that are probably dependent on previous results, and server can continue call such functions and push results. These fetching and pushing (termed as 'turns' here) can repeat several times until no more calls are needed or maximum iteration number is reached.
 2. more than one function call can happen within one turn, and all of the results of these function calls are collected and pushed to LLM.

The `scratchpad.js` is modified to improve the ability of memorizing by
 1. adding fuzzy matching between query and key/memory, in case that the query does not completely equal the key, or that the query is only related with memory string but not key string.
 2. adding delete functionality to both align with the description and to more comprehensively manage the memory file.
 3. adding timestamp when writing to the memory file, to demonstrate how it can coordinate with the `getTime` function.

The `getTime.js` is a newly added function to simply get the current time for the LLM to use.

### Demo

 1. Demo of one function, one turn, multiple calls  
    **Prompt**: Note down that Alice likes candy and that Bob likes chocolate.  
    **Function**:  
    ```
    [
        [
            scratchpad(action: 'set', key: 'Alice', memory: 'likes candy'),
            scratchpad(action: 'set', key: 'Bob',  memory: 'likes chocolate')
        ]
    ]
    ```
 2. Demo of one function, multiple turns  
    **Prompt**: Clear all memory.  
    **Function**:
    ```
    [
        [
            scratchpad(action: 'getall')
        ],
        [
            scratchpad(action: 'delete', key: 'Alice'),
            scratchpad(action: 'delete', key: 'Bob')
        ]
    ]
    ```
 3. Demo of multiple functions, multiple turns  
    **Prompt**: What was noted in your memory within one hour before current time?  
    **Function**:
    ```
    [
        [
            getTime()
        ],
        [
            scratchpad(action: 'getall')
        ]
    ]
    ```