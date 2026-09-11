const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../pb_hooks/visitors_cleanup.pb.js"), "utf8");
const now = Date.parse("2026-09-10T12:00:00.000Z");
const day = 24 * 60 * 60 * 1000;
const cutoff = new Date(now - 30 * day).toISOString().replace("T", " ");
const old = new Date(now - 31 * day).toISOString().replace("T", " ");

function record(id, fields) {
    return { id, ...fields };
}

function run(data, failures = new Set(), missing = new Set()) {
    const saved = [];
    const errors = [];
    const queries = [];
    let callback;
    vm.runInNewContext(source, {
        Date: class extends Date { static now() { return now; } },
        cronAdd(name, schedule, fn) {
            assert.equal(name, "deleteOldPhotos");
            assert.equal(schedule, "0 0 * * *");
            callback = fn;
        },
        console: { log() {}, error(message) { errors.push(message); } },
        $app: {
            findRecordsByFilter(collection, filter, sort, limit, offset, params) {
                if (missing.has(collection)) throw new Error("Missing collection");
                assert.equal(params.cutoffDate, new Date(now - (collection === "parcels" ? 30 : 7) * day).toISOString().replace("T", " "));
                assert.equal(sort, "id");
                assert.equal(offset, 0);
                const dateField = { people: "updated", parcels: "arrived_at" }[collection] || "created";
                assert.equal(filter, dateField + ' < {:cutoffDate} && ' + dateField + ' != "" && id > {:lastId}');
                queries.push(collection);
                return (data[collection] || [])
                    .filter(r => r[dateField] && r[dateField] < params.cutoffDate && r.id > params.lastId)
                    .sort((a, b) => a.id.localeCompare(b.id))
                    .slice(0, limit)
                    .map(original => {
                        const values = { ...original };
                        return {
                            id: original.id,
                            collection,
                            getStringSlice(field) {
                                const value = values[field];
                                return Array.isArray(value) ? value : value ? [value] : [];
                            },
                            set(field, value) { values[field] = value; },
                            persist() { Object.assign(original, values); },
                        };
                    });
            },
            save(r) {
                if (failures.has(r.id)) throw new Error("Save failed");
                r.persist();
                saved.push(r.collection + "/" + r.id);
            },
        },
    });
    callback();
    return { saved, errors, queries };
}

test("keeps recent photos and the exact 7-day or 30-day boundary in each collection", () => {
    const data = {};
    for (const collection of ["people", "visitors", "service_providers", "rental_guests", "parcels"]) {
        const field = { people: "updated", parcels: "arrived_at" }[collection] || "created";
        const retentionDays = collection === "parcels" ? 30 : 7;
        const collectionCutoff = new Date(now - retentionDays * day).toISOString().replace("T", " ");
        data[collection] = [
            record("a", { [field]: new Date(now - (retentionDays - 1) * day).toISOString().replace("T", " "), photo: "recent.jpg" }),
            record("b", { [field]: collectionCutoff, photo: "boundary.jpg" }),
            record("c", { [field]: new Date(now - retentionDays * day - 1).toISOString().replace("T", " "), photo: "expired.jpg", name: "Preserved" }),
            record("d", { [field]: "", photo: "undated.jpg" }),
            record("e", { [field]: old, photo: [] }),
        ];
    }
    const result = run(data);
    assert.equal(result.saved.length, 5);
    for (const records of Object.values(data)) {
        assert.equal(records.length, 5);
        assert.equal(records[0].photo, "recent.jpg");
        assert.equal(records[1].photo, "boundary.jpg");
        assert.equal(records[2].photo, null);
        assert.equal(records[2].name, "Preserved");
        assert.equal(records[3].photo, "undated.jpg");
    }
});

test("clears all parcel photos by arrival date for pending and collected parcels", () => {
    const data = { parcels: [
        record("a", { arrived_at: old, updated: new Date(now).toISOString().replace("T", " "), photo: ["1.jpg", "2.jpg", "3.jpg"], status: "pending" }),
        record("b", { arrived_at: old, photo: ["4.jpg"], status: "collected" }),
        record("c", { arrived_at: new Date(now).toISOString().replace("T", " "), created: old, photo: ["new.jpg"] }),
    ] };
    assert.equal(run(data).saved.length, 2);
    assert.equal(data.parcels[0].photo, null);
    assert.equal(data.parcels[0].status, "pending");
    assert.equal(data.parcels[1].status, "collected");
    assert.deepEqual(data.parcels[2].photo, ["new.jpg"]);
});

test("keeps people retention based on last update and access photos on creation", () => {
    const recent = new Date(now - day).toISOString().replace("T", " ");
    const data = {
        people: [record("a", { created: old, updated: recent, photo: "person.jpg" })],
        visitors: [record("b", { created: old, updated: recent, photo: "visit.jpg" })],
    };
    assert.deepEqual(run(data).saved, ["visitors/b"]);
    assert.equal(data.people[0].photo, "person.jpg");
});

test("processes more than two batches without skipping photos or deleting records", () => {
    const data = { parcels: Array.from({ length: 205 }, (_, i) =>
        record(String(i).padStart(4, "0"), { arrived_at: old, photo: ["file.jpg"], description: "Keep" })) };
    const result = run(data);
    assert.equal(result.saved.length, 205);
    assert.equal(data.parcels.length, 205);
    assert.ok(data.parcels.every(r => r.photo === null && r.description === "Keep"));
    assert.equal(new Set(result.saved).size, 205);
});

test("logs failures, continues with other records and collections, and retries next run", () => {
    const data = {
        people: [record("a", { updated: old, photo: "retry.jpg" }), record("b", { updated: old, photo: "ok.jpg" })],
        parcels: [record("c", { arrived_at: old, photo: ["parcel.jpg"] })],
    };
    const first = run(data, new Set(["a"]), new Set(["visitors"]));
    assert.deepEqual(first.saved, ["people/b", "parcels/c"]);
    assert.equal(first.errors.length, 2);
    assert.equal(data.people[0].photo, "retry.jpg");
    assert.deepEqual(run(data).saved, ["people/a"]);
});

test("removes eight-day-old people photos but retains eight-day-old parcel photos", () => {
    const eightDaysAgo = new Date(now - 8 * day).toISOString().replace("T", " ");
    const data = {
        people: [record("a", { updated: eightDaysAgo, photo: "person.jpg" })],
        visitors: [record("b", { created: eightDaysAgo, photo: "visit.jpg" })],
        service_providers: [record("c", { created: eightDaysAgo, photo: "provider.jpg" })],
        rental_guests: [record("d", { created: eightDaysAgo, photo: "guest.jpg" })],
        parcels: [record("e", { arrived_at: eightDaysAgo, photo: ["parcel.jpg"] })],
    };
    const result = run(data);
    assert.deepEqual(result.saved, ["people/a", "visitors/b", "service_providers/c", "rental_guests/d"]);
    assert.deepEqual(data.parcels[0].photo, ["parcel.jpg"]);
});
