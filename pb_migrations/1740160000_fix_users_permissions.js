/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Ensure users collection allows viewing by authenticated users
    // This is required for the 'expand' operation in logs to work
    try {
        const users = app.findCollectionByNameOrId("users");
        if (!users.viewRule) {
            users.viewRule = "@request.auth.id != ''";
            app.save(users);
        }
    } catch (e) {
        console.log("Error updating users view rule:", e);
    }

    // 2. Ensure system_logs collection is correctly configured
    try {
        const system_logs = app.findCollectionByNameOrId("system_logs");

        // Update rules to be more explicit
        system_logs.listRule = "@request.auth.id != ''";
        system_logs.viewRule = "@request.auth.id != ''";
        system_logs.createRule = "@request.auth.id != ''";
        system_logs.updateRule = "";
        system_logs.deleteRule = "";

        app.save(system_logs);
    } catch (e) {
        console.log("Error updating system_logs rules:", e);
    }
}, (app) => { })
