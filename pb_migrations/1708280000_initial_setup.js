/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Update users collection
    const users = app.findCollectionByNameOrId("users");

    // Add fields (using try-catch to avoid errors if they already exist)
    try {
        users.fields.add(new SelectField({
            name: "role",
            values: ["admin", "operator"]
        }));
        users.fields.add(new BoolField({
            name: "must_change_password",
        }));
        app.save(users);
    } catch (e) { }

    // Helper to create collection with basic auth rules
    const createSafeColl = (name, fields) => {
        try {
            const coll = new Collection({
                name: name,
                type: "base",
                fields: fields,
                listRule: "@request.auth.id != ''",
                viewRule: "@request.auth.id != ''",
                createRule: "@request.auth.id != ''",
                updateRule: "@request.auth.id != ''",
                deleteRule: "@request.auth.id != ''",
            });
            app.save(coll);
            return coll;
        } catch (e) {
            return app.findCollectionByNameOrId(name);
        }
    };

    // 2. Create condominium collection
    const condominium = createSafeColl("condominium", [
        new TextField({ name: "name", required: true }),
        new TextField({ name: "cnpj" }),
        new TextField({ name: "address" }),
        new TextField({ name: "phone" }),
        new NumberField({ name: "tower_count" }),
        new TextField({ name: "tower_prefix" }),
        new TextField({ name: "tower_naming" }),
        new TextField({ name: "party_room_name" }),
        new NumberField({ name: "party_room_capacity" }),
        new TextField({ name: "party_room_rules" }),
        new NumberField({ name: "party_room_count" }),
        new TextField({ name: "party_room_naming" }),
    ]);

    // 3. Create units collection
    const units = createSafeColl("units", [
        new TextField({ name: "unit_number", required: true }),
        new TextField({ name: "block" }),
        new TextField({ name: "resident_name", required: true }),
        new TextField({ name: "phone_number" }),
    ]);

    // 4. Create vehicles collection
    const vehicles = createSafeColl("vehicles", [
        new TextField({ name: "plate", required: true }),
        new TextField({ name: "model", required: true }),
        new TextField({ name: "color" }),
        new SelectField({ name: "type", values: ["car", "motorcycle", "truck"] }),
        new RelationField({ name: "unit_id", required: true, collectionId: units.id, maxSelect: 1 }),
    ]);

    // 5. Create service_providers collection
    const service_providers = createSafeColl("service_providers", [
        new TextField({ name: "name", required: true }),
        new TextField({ name: "document" }),
        new TextField({ name: "company" }),
        new FileField({ name: "photo", maxSelect: 1, maxSize: 5242880 }),
        new DateField({ name: "entry_time" }),
        new DateField({ name: "exit_time" }),
        new RelationField({ name: "unit_id", collectionId: units.id, maxSelect: 1 }),
        new RelationField({ name: "created_by", collectionId: users.id, maxSelect: 1 }),
    ]);

    // 6. Create parcels collection
    const parcels = createSafeColl("parcels", [
        new TextField({ name: "protocol_number" }),
        new TextField({ name: "description", required: true }),
        new FileField({ name: "photo", maxSelect: 1, maxSize: 5242880 }),
        new SelectField({ name: "status", required: true, values: ["pending", "collected"] }),
        new DateField({ name: "arrived_at", required: true }),
        new DateField({ name: "collected_at" }),
        new RelationField({ name: "unit_id", required: true, collectionId: units.id, maxSelect: 1 }),
        new RelationField({ name: "created_by", collectionId: users.id, maxSelect: 1 }),
    ]);

    // 7. Create rental_guests collection
    const rental_guests = createSafeColl("rental_guests", [
        new TextField({ name: "name", required: true }),
        new TextField({ name: "document" }),
        new TextField({ name: "plate" }),
        new FileField({ name: "photo", maxSelect: 1, maxSize: 5242880 }),
        new DateField({ name: "entry_time", required: true }),
        new DateField({ name: "exit_time" }),
        new RelationField({ name: "unit_id", required: true, collectionId: units.id, maxSelect: 1 }),
        new RelationField({ name: "created_by", collectionId: users.id, maxSelect: 1 }),
    ]);

    // 8. Create party_room_bookings collection
    const party_room_bookings = createSafeColl("party_room_bookings", [
        new DateField({ name: "booking_date", required: true }),
        new SelectField({ name: "period", required: true, values: ["morning", "afternoon", "full_day"] }),
        new TextField({ name: "party_room_id" }),
        new RelationField({ name: "unit_id", required: true, collectionId: units.id, maxSelect: 1 }),
        new RelationField({ name: "created_by", collectionId: users.id, maxSelect: 1 }),
    ]);

    // 9. Create initial regular user
    try {
        const admin = new Record(users, {
            email: "admin@admin.com",
            name: "Administrador",
            role: "admin",
            must_change_password: false,
        });
        admin.setPassword("admin123");
        app.save(admin);
    } catch (e) { }
}, (app) => { })
