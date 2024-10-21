function execute() {
    return new Date().toLocaleString().replace(/,/g, '')
}

const details = {
    "type": "function",
    function: {
        "name": "getTime",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        },
    },
    "description": "Get the current time"
};

export { execute, details };