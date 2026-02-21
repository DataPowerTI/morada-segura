/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    try {
        const users = app.findCollectionByNameOrId("users");

        let system_logs;
        try {
            system_logs = app.findCollectionByNameOrId("system_logs");
        } catch (e) {
            system_logs = new Collection({
                name: "system_logs",
                type: "base",
            });
        }

        // Ensuring fields exist
        const fields = [
            new RelationField({ name: "user_id", collectionId: users.id, maxSelect: 1, required: true }),
            new TextField({ name: "action", required: true }),
            new TextField({ name: "target_collection" }),
            new TextField({ name: "target_id" }),
            new TextField({ name: "description", required: true })
        ];

        for (const field of fields) {
            try {
                system_logs.fields.add(field);
            } catch (e) {
                // Field might already exist, which is fine in some PB versions
            }
        }

        system_logs.listRule = "@request.auth.id != ''";
        system_logs.viewRule = "@request.auth.id != ''";
        system_logs.createRule = "@request.auth.id != ''";
        system_logs.updateRule = "";
        system_logs.deleteRule = "";

        app.save(system_logs);

        // Also ensure users view rule is set
        users.viewRule = "@request.auth.id != ''";
        app.save(users);

    } catch (error) {
        console.log("CRITICAL ERROR IN MIGRATION:", error);
    }
}, (app) => { })
