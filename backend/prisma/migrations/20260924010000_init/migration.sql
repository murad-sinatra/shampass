-- CreateEnum
CREATE TYPE "Role" AS ENUM ('customer', 'provider');
CREATE TYPE "SeatClass" AS ENUM ('economy', 'comfort', 'premium');
CREATE TYPE "TripStatus" AS ENUM ('scheduled', 'boarding', 'departed', 'arrived', 'cancelled');
CREATE TYPE "SeatStatus" AS ENUM ('available', 'booked', 'blocked');
CREATE TYPE "BookingStatus" AS ENUM ('confirmed', 'cancelled');
CREATE TYPE "PayMethod" AS ENUM ('shamcash', 'visa', 'mastercard');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "buses" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amenities" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "buses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bus_seats" (
    "id" TEXT NOT NULL,
    "bus_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" TEXT NOT NULL,
    "class" "SeatClass" NOT NULL,
    CONSTRAINT "bus_seats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "origin_id" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "distance_km" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "route_prices" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "class" "SeatClass" NOT NULL,
    "price_syp" INTEGER NOT NULL,
    CONSTRAINT "route_prices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "bus_id" TEXT NOT NULL,
    "depart_at" TIMESTAMP(3) NOT NULL,
    "arrive_at" TIMESTAMP(3) NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'scheduled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trip_seats" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" TEXT NOT NULL,
    "class" "SeatClass" NOT NULL,
    "price_syp" INTEGER NOT NULL,
    "status" "SeatStatus" NOT NULL DEFAULT 'available',
    CONSTRAINT "trip_seats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "pay_method" "PayMethod" NOT NULL,
    "pay_last4" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'confirmed',
    "total_syp" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_seats" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "trip_seat_id" TEXT NOT NULL,
    "passenger_name" TEXT NOT NULL,
    "price_syp" INTEGER NOT NULL,
    CONSTRAINT "booking_seats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "kind" TEXT NOT NULL,
    "title_ar" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "body_ar" TEXT NOT NULL,
    "body_en" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "companies_owner_id_key" ON "companies"("owner_id");
CREATE UNIQUE INDEX "buses_company_id_code_key" ON "buses"("company_id", "code");
CREATE UNIQUE INDEX "bus_seats_bus_id_label_key" ON "bus_seats"("bus_id", "label");
CREATE INDEX "routes_origin_id_destination_id_idx" ON "routes"("origin_id", "destination_id");
CREATE UNIQUE INDEX "routes_company_id_origin_id_destination_id_key" ON "routes"("company_id", "origin_id", "destination_id");
CREATE UNIQUE INDEX "route_prices_route_id_class_key" ON "route_prices"("route_id", "class");
CREATE INDEX "trips_depart_at_idx" ON "trips"("depart_at");
CREATE INDEX "trips_route_id_depart_at_idx" ON "trips"("route_id", "depart_at");
CREATE UNIQUE INDEX "trip_seats_trip_id_label_key" ON "trip_seats"("trip_id", "label");
CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings"("reference");
CREATE INDEX "bookings_user_id_created_at_idx" ON "bookings"("user_id", "created_at");
CREATE INDEX "booking_seats_trip_seat_id_idx" ON "booking_seats"("trip_seat_id");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buses" ADD CONSTRAINT "buses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bus_seats" ADD CONSTRAINT "bus_seats_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "buses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routes" ADD CONSTRAINT "routes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routes" ADD CONSTRAINT "routes_origin_id_fkey" FOREIGN KEY ("origin_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "routes" ADD CONSTRAINT "routes_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "route_prices" ADD CONSTRAINT "route_prices_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "buses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trip_seats" ADD CONSTRAINT "trip_seats_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_trip_seat_id_fkey" FOREIGN KEY ("trip_seat_id") REFERENCES "trip_seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
