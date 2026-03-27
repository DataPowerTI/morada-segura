/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    let visitors;
    try {
        visitors = app.findCollectionByNameOrId("visitors");
        console.log("Visitors collection already exists, updating fields...");
    } catch (e) {
        console.log("Creating visitors collection...");
        visitors = new Collection({
            name: "visitors",
            type: "base"
        });
    }

    // Add fields safely (ignoring if they already exist)
    const addField = (field) => {
        try {
            visitors.fields.add(field);
        } catch (e) { }
    };

    addField(new TextField({ name: "name", required: true }));
    addField(new TextField({ name: "document" }));
    addField(new TextField({ name: "phone" }));
    addField(new DateField({ name: "entry_time", required: true }));
    const unitsCollection = app.findCollectionByNameOrId("units");
    addField(new RelationField({ name: "unit_id", collectionId: unitsCollection.id, maxSelect: 1 }));
    addField(new FileField({
        name: "photo",
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"]
    }));

    visitors.listRule = "@request.auth.id != ''";
    visitors.viewRule = "@request.auth.id != ''";
    visitors.createRule = "@request.auth.id != ''";
    visitors.updateRule = "@request.auth.id != ''";
    visitors.deleteRule = "@request.auth.id != ''";

    return app.save(visitors);
}, (app) => {
    try {
        const collection = app.findCollectionByNameOrId("visitors");
        return app.delete(collection);
    } catch (e) { }
})
