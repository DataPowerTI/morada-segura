/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Force USERS collection to be public for viewing (needed for expand/lookup)
    try {
        const users = app.findCollectionByNameOrId("users");
        users.viewRule = ""; // Empty string means public access for viewing records
        users.listRule = "@request.auth.id != ''";
        app.save(users);
    } catch (e) {
        console.log("Error forcing users rules:", e);
    }

    // 2. Force SYSTEM_LOGS to be a BASE collection and public
    try {
        let system_logs;
        try {
            system_logs = app.findCollectionByNameOrId("system_logs");
            // If it exists, ensure it's a base collection and has rules
            system_logs.type = "base";
        } catch (e) {
            system_logs = new Collection({
                name: "system_logs",
                type: "base",
            });
        }

        system_logs.listRule = ""; // Public for testing
        system_logs.viewRule = ""; // Public for testing
        system_logs.createRule = ""; // Public for testing

        app.save(system_logs);
    } catch (e) {
        console.log("Error forcing system_logs rules:", e);
    }
}, (app) => { })
