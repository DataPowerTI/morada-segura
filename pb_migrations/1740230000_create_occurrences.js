/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    let occurrences;
    try {
        occurrences = app.findCollectionByNameOrId("occurrences");
        console.log("Occurrences collection already exists, updating fields...");
    } catch (e) {
        console.log("Creating occurrences collection...");
        occurrences = new Collection({
            name: "occurrences",
            type: "base"
        });
    }

    // Add fields safely (ignoring if they already exist)
    const addField = (field) => {
        try {
            occurrences.fields.add(field);
        } catch (e) { }
    };

    addField(new TextField({ name: "title", required: true }));
    addField(new TextField({ name: "description", required: true }));
    addField(new SelectField({ name: "status", values: ["pending", "in_progress", "resolved"], required: true }));
    addField(new SelectField({ name: "type", values: ["problem", "suggestion", "other"], required: true }));
    const unitsCol = app.findCollectionByNameOrId("units");
    const usersCol = app.findCollectionByNameOrId("users");
    addField(new RelationField({ name: "unit_id", collectionId: unitsCol.id, maxSelect: 1 }));
    addField(new RelationField({ name: "created_by", collectionId: usersCol.id, maxSelect: 1 }));

    occurrences.listRule = "@request.auth.id != ''";
    occurrences.viewRule = "@request.auth.id != ''";
    occurrences.createRule = "@request.auth.id != ''";
    occurrences.updateRule = "@request.auth.id != ''";
    occurrences.deleteRule = "@request.auth.id != ''";

    return app.save(occurrences);
}, (app) => {
    try {
        const collection = app.findCollectionByNameOrId("occurrences");
        return app.delete(collection);
    } catch (e) { }
})
