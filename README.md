# Laishaz Studio

A complete website for **Laishaz Studio**, a beauty salon & spa in Kharghar, Navi Mumbai.

## Features

- Beautiful salon homepage with services, about, and contact pages
- Customers can sign up and log in to their own account
- Online appointment booking with date & time selection
- Customers can view their past and upcoming appointments
- Admin dashboard to manage all bookings (confirm, mark done, delete)
- Mobile-friendly design with hamburger menu
- All bookings shared across devices via PostgreSQL database

## Files

| File | What it does |
|------|--------------|
| `index.html` | The full website (frontend) |
| `server.js` | The backend — handles login, signup, and bookings |
| `package.json` | Lists the tools the server needs |

## Admin Login

There are two admin accounts:

- Username: `admin` / Password: `laishaz2025`
- Username: `gautam` / Password: `gautam`

To reach the admin login, add `#admin` to the website URL (e.g. `yoursite.com/#admin`).

## How to Run

1. Make sure Node.js 18+ is installed.
2. Set the `DATABASE_URL` environment variable to your PostgreSQL database.
3. Install the tools:
