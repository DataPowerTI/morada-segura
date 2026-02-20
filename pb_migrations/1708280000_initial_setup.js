/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Update users collection
    const users = app.findCollectionByNameOrId("users");

    users.fields.add(new core.SelectField({
        name: "role",
        values: ["admin", "operator"]
    }));

    users.fields.add(new core.BoolField({
        name: "must_change_password",
    }));

    app.save(users);

    // 2. Create condominium collection
    const condominium = new core.Collection({
        name: "condominium",
        type: "base",
        fields: [
            new core.TextField({ name: "name", required: true }),
            new core.TextField({ name: "cnpj" }),
            new core.TextField({ name: "address" }),
            new core.TextField({ name: "phone" }),
            new core.NumberField({ name: "tower_count" }),
            new core.TextField({ name: "tower_prefix" }),
            new core.TextField({ name: "tower_naming" }),
            new core.TextField({ name: "party_room_name" }),
            new core.NumberField({ name: "party_room_capacity" }),
            new core.TextField({ name: "party_room_rules" }),
            new core.NumberField({ name: "party_room_count" }),
            new core.TextField({ name: "party_room_naming" }),
        ],
        listRule: "", viewRule: "", createRule: "role = 'admin'", updateRule: "role = 'admin'", deleteRule: "role = 'admin'",
    });
    app.save(condominium);

    // 3. Create units collection
    const units = new core.Collection({
        name: "units",
        type: "base",
        fields: [
            new core.TextField({ name: "unit_number", required: true }),
            new core.TextField({ name: "block" }),
            new core.TextField({ name: "resident_name", required: true }),
            new core.TextField({ name: "phone_number" }),
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    app.save(units);

    // 4. Create vehicles collection
    const vehicles = new core.Collection({
        name: "vehicles",
        type: "base",
        fields: [
            new core.TextField({ name: "plate", required: true }),
            new core.TextField({ name: "model", required: true }),
            new core.TextField({ name: "color" }),
            new core.SelectField({ name: "type", values: ["car", "motorcycle", "truck"] }),
            new core.RelationField({ name: "unit_id", required: true, collectionId: units.id, maxSelect: 1 }),
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    app.save(vehicles);

    // 5. Create service_providers collection
    const service_providers = new core.Collection({
        name: "service_providers",
        type: "base",
        fields: [
            new core.TextField({ name: "name", required: true }),
            new core.TextField({ name: "document" }),
            new core.TextField({ name: "company" }),
            new core.FileField({ name: "photo", maxSelect: 1, maxSize: 5242880 }),
            new core.DateField({ name: "entry_time" }),
            new core.DateField({ name: "exit_time" }),
            new core.RelationField({ name: "unit_id", collectionId: units.id, maxSelect: 1 }),
            new core.RelationField({ name: "created_by", collectionId: users.id, maxSelect: 1 }),
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    app.save(service_providers);

    // 6. Create parcels collection
    const parcels = new core.Collection({
        name: "parcels",
        type: "base",
        fields: [
            new core.TextField({ name: "protocol_number" }),
            new core.TextField({ name: "description", required: true }),
            new core.FileField({ name: "photo", maxSelect: 1, maxSize: 5242880 }),
            new core.SelectField({ name: "status", required: true, values: ["pending", "collected"] }),
            new core.DateField({ name: "arrived_at", required: true }),
            new core.DateField({ name: "collected_at" }),
            new core.RelationField({ name: "unit_id", required: true, collectionId: units.id, maxSelect: 1 }),
            new core.RelationField({ name: "created_by", collectionId: users.id, maxSelect: 1 }),
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    app.save(parcels);

    // 7. Create rental_guests collection
    const rental_guests = new core.Collection({
        name: "rental_guests",
        type: "base",
        fields: [
            new core.TextField({ name: "name", required: true }),
            new core.TextField({ name: "document" }),
            new core.TextField({ name: "plate" }),
            new core.FileField({ name: "photo", maxSelect: 1, maxSize: 5242880 }),
            new core.DateField({ name: "entry_time", required: true }),
            new core.DateField({ name: "exit_time" }),
            new core.RelationField({ name: "unit_id", required: true, collectionId: units.id, maxSelect: 1 }),
            new core.RelationField({ name: "created_by", collectionId: users.id, maxSelect: 1 }),
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    app.save(rental_guests);

    // 8. Create party_room_bookings collection
    const party_room_bookings = new core.Collection({
        name: "party_room_bookings",
        type: "base",
        fields: [
            new core.DateField({ name: "booking_date", required: true }),
            new core.SelectField({ name: "period", required: true, values: ["morning", "afternoon", "full_day"] }),
            new core.TextField({ name: "party_room_id" }),
            new core.RelationField({ name: "unit_id", required: true, collectionId: units.id, maxSelect: 1 }),
            new core.RelationField({ name: "created_by", collectionId: users.id, maxSelect: 1 }),
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    app.save(party_room_bookings);

    // 9. Create initial admin user
    try {
        const admin = new core.Record(users, {
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
