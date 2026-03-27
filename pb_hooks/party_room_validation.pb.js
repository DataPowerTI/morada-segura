// Validates party room bookings to prevent conflicts.
// A conflict occurs when the same party room (party_room_id) is booked
// on the same date with overlapping periods.
// Different party rooms CAN be booked on the same date.
onRecordCreateRequest((e) => {
    const data = e.record;
    const bookingDate = data.get("booking_date");
    const period = data.get("period");
    const partyRoomId = data.get("party_room_id") || "1";

    // Normalize booking_date to YYYY-MM-DD for comparison
    const dateStr = String(bookingDate).substring(0, 10);

    // Find existing bookings for the same party room on the same date
    const existing = $app.findAllRecords("party_room_bookings",
        $dbx.hashExp({
            "party_room_id": partyRoomId,
        })
    );

    const conflicts = existing.filter((b) => {
        const bDateStr = String(b.get("booking_date")).substring(0, 10);
        if (bDateStr !== dateStr) return false;

        const bPeriod = b.get("period");

        // full_day conflicts with everything
        if (period === "full_day" || bPeriod === "full_day") return true;

        // Same period conflicts
        if (period === bPeriod) return true;

        return false;
    });

    if (conflicts.length > 0) {
        throw new BadRequestError(
            `O ${partyRoomId > 1 ? 'Salão ' + partyRoomId : 'Salão de Festas'} já está reservado nesta data para o período selecionado.`
        );
    }

    e.next();
}, "party_room_bookings");
