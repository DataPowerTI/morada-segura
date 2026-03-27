/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // Helper to get or create collection
    const getOrCreate = (name, type = "base") => {
        try {
            return app.findCollectionByNameOrId(name);
        } catch (e) {
            return new Collection({ name, type });
        }
    };

    // 1. Create People collection
    const people = getOrCreate("people");
    people.fields.add(new TextField({ name: "name", required: true }));
    people.fields.add(new TextField({ name: "document" }));
    people.fields.add(new TextField({ name: "phone" }));
    people.fields.add(new TextField({ name: "company" }));
    people.fields.add(new TextField({ name: "vehicle_plate" }));
    people.fields.add(new FileField({ 
        name: "photo", 
        maxSelect: 1, 
        maxSize: 5242880,
        mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"]
    }));

    people.listRule = "@request.auth.id != ''";
    people.viewRule = "@request.auth.id != ''";
    people.createRule = "@request.auth.id != ''";
    people.updateRule = "@request.auth.id != ''";
    people.deleteRule = "@request.auth.id != ''";
    app.save(people);

    // 2. Update existing tables to link to people
    const addPersonRelation = (collectionName) => {
        try {
            const col = app.findCollectionByNameOrId(collectionName);
            // Check if field exists
            let hasField = false;
            for (let f of col.fields) {
                if (f.name === "person_id") hasField = true;
            }
            if (!hasField) {
                col.fields.add(new RelationField({ 
                    name: "person_id", 
                    collectionId: people.id, 
                    maxSelect: 1 
                }));
                app.save(col);
                console.log(`Added person_id to ${collectionName}`);
            }
        } catch (e) {
            console.log(`Collection ${collectionName} not found or error adding field:`, e);
        }
    };

    addPersonRelation("visitors");
    addPersonRelation("service_providers");
    addPersonRelation("rental_guests");

}, (app) => {
    try {
        app.delete(app.findCollectionByNameOrId("people"));
    } catch (e) {}
});
