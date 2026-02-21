/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const getOrCreate = (name, type = "base") => {
        try {
            return app.findCollectionByNameOrId(name);
        } catch (e) {
            return new Collection({ name, type });
        }
    };

    const users = app.findCollectionByNameOrId("users");
    const system_logs = getOrCreate("system_logs");
    
    // Reset fields to ensure we don't have duplicates if migration runs again
    // In PocketBase migrations, it's safer to just add if they don't exist or re-save
    // But since this is a new collection creation, we just add them.
    
    system_logs.fields.add(new RelationField({ 
        name: "user_id", 
        collectionId: users.id,
        maxSelect: 1,
        required: true 
    }));
    
    system_logs.fields.add(new TextField({ 
        name: "action", 
        required: true 
    }));
    
    system_logs.fields.add(new TextField({ 
        name: "target_collection" 
    }));
    
    system_logs.fields.add(new TextField({ 
        name: "target_id" 
    }));
    
    system_logs.fields.add(new TextField({ 
        name: "description", 
        required: true 
    }));

    system_logs.listRule = "@request.auth.id != ''";
    system_logs.viewRule = "@request.auth.id != ''";
    system_logs.createRule = "@request.auth.id != ''";
    system_logs.updateRule = ""; 
    system_logs.deleteRule = ""; 

    app.save(system_logs);
}, (app) => {
    try {
        const collection = app.findCollectionByNameOrId("system_logs");
        app.delete(collection);
    } catch (e) { }
})
