/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Forced fix for users view rule
    try {
        const users = app.findCollectionByNameOrId("users");
        users.viewRule = "@request.auth.id != ''";
        app.save(users);
    } catch (e) {
        console.log("Error updating users view rule in final fix:", e);
    }

    // 2. Forced fix for system_logs rules
    try {
        const system_logs = app.findCollectionByNameOrId("system_logs");
        system_logs.listRule = "@request.auth.id != ''";
        system_logs.viewRule = "@request.auth.id != ''";
        system_logs.createRule = "@request.auth.id != ''";
        app.save(system_logs);
    } catch (e) {
        console.log("Error updating system_logs rules in final fix:", e);
    }
}, (app) => { })
