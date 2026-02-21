/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Update users collection
    const users = app.findCollectionByNameOrId("users");

    // Attempting to add fields using global constructors
    users.fields.add(new SelectField({
        name: "role",
        values: ["admin", "operator"]
    }));

    users.fields.add(new BoolField({
        name: "must_change_password",
    }));

    app.save(users);

    // Helper to create collection
    const createColl = (name, fields, rules = {}) => {
        const collection = new Collection({
            name: name,
            type: "base",
            fields: fields,
            ...rules
        });
        return app.save(collection);
    };

    // 2. Create condominium collection
    const condominium = new Collection({
        name: "condominium",
        type: "base",
        fields: [
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
        ],
        listRule: "", viewRule: "", createRule: "role = 'admin'", updateRule: "role = 'admin'", deleteRule: "role = 'admin'",
    });
    app.save(condominium);

    // 3. Create units collection
    const units = new Collection({
        name: "units",
        type: "base",
        fields: [
            new TextField({ name: "unit_number", required: true }),
            new TextField({ name: "block" }),
            new TextField({ name: "resident_name", required: true }),
            new TextField({ name: "phone_number" }),
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    app.save(units);

    // 4. Create vehicles collection
    const vehicles = new Collection({
        name: "vehicles",
        type: "base",
        fields: [
            new TextField({ name: "plate", required: true }),
            new TextField({ name: "model", required: true }),
            new TextField({ name: "color" }),
            new SelectField({ name: "type", values: ["car", "motorcycle", "truck"] }),
            new RelationField({ name: "unit_id", required: true, collectionId: units.id, maxSelect: 1 }),
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    app.save(vehicles);

    // 5. Create service_providers collection
    const service_providers = new Collection({
        name: "service_providers",
        type: "base",
        fields: [
            new TextField({ name: "name", required: true }),
            new TextField({ name: "document" }),
            new TextField({ name: "company" }),
            new FileField({ name: "photo", maxSelect: 1, maxSize: 5242880 }),
            new DateField({ name: "entry_time" }),
            new DateField({ name: "exit_time" }),
            new RelationField({ name: "unit_id", collectionId: units.id, maxSelect: 1 }),
            new RelationField({ name: "created_by", collectionId: users.id, maxSelect: 1 }),
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    app.save(service_providers);

    // 6. Create parcels collection
    const parcels = new Collection({
        name: "parcels",
        type: "base",
        fields: [
            new TextField({ name: "protocol_number" }),
            new TextField({ name: "description", required: true }),
            new FileField({ name: "photo", maxSelect: 1, maxSize: 5242880 }),
            new SelectField({ name: "status", required: true, values: ["pending", "collected"] }),
            new DateField({ name: "arrived_at", required: true }),
            new DateField({ name: "collected_at" }),
            new RelationField({ name: "unit_id", required: true, collectionId: units.id, maxSelect: 1 }),
            new RelationField({ name: "created_by", collectionId: users.id, maxSelect: 1 }),
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    app.save(parcels);

    // 7. Create rental_guests collection
    const rental_guests = new Collection({
        name: "rental_guests",
        type: "base",
        fields: [
            new TextField({ name: "name", required: true }),
            new TextField({ name: "document" }),
            new TextField({ name: "plate" }),
            new FileField({ name: "photo", maxSelect: 1, maxSize: 5242880 }),
            new DateField({ name: "entry_time", required: true }),
            new DateField({ name: "exit_time" }),
            new RelationField({ name: "unit_id", required: true, collectionId: units.id, maxSelect: 1 }),
            new RelationField({ name: "created_by", collectionId: users.id, maxSelect: 1 }),
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    app.save(rental_guests);

    // 8. Create party_room_bookings collection
    const party_room_bookings = new Collection({
        name: "party_room_bookings",
        type: "base",
        fields: [
            new DateField({ name: "booking_date", required: true }),
            new SelectField({ name: "period", required: true, values: ["morning", "afternoon", "full_day"] }),
            new TextField({ name: "party_room_id" }),
            new RelationField({ name: "unit_id", required: true, collectionId: units.id, maxSelect: 1 }),
            new RelationField({ name: "created_by", collectionId: users.id, maxSelect: 1 }),
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    app.save(party_room_bookings);

    // 9. Create initial admin user
    try {
        const admin = new Record(users, {
            email: "admin@admin.com",
            name: "Administrador",
            role: "admin",
            must_change_password: false,
        });
        admin.setPassword("admin123");
        app.save(admin);
    } catch (e) {
        // User probably exists
    }
}, (app) => {
    // Optional rollback
})
