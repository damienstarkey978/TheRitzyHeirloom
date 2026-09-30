# Point of sale

The shop desk keeps a portable inventory record for each piece: a stable SKU, an optional barcode, cost, price, quantity, status, location, and timestamps. A change history is stored beside the piece. The database is SQLite on the Fly volume. The inventory columns are ordinary text, integers, and timestamps, so the same shape can move to Postgres later without a new inventory model.

Statuses are `draft`, `available`, `held`, and `sold`.

Categories are Jewelry, Fine art, European and English pieces, French fabrics and wallpapers, Furniture and decorative, and Other.

## Desk export

On the pieces page, **Download inventory CSV** saves the current inventory. That download uses the shop desk sign-in and still sits behind the site password.

## Read API

`GET https://ritzy-heirloom-dev.fly.dev/api/pos/inventory`

This path is outside the site password. It requires a bearer token:

```http
Authorization: Bearer <RITZY_POS_TOKEN>
```

`RITZY_POS_TOKEN` is a Fly secret. It is not in git. If the secret is unset, the API responds `503`. A missing or wrong token responds `401`.

The JSON body is `{ "pieces": [ ... ] }`. Each piece includes:

- `sku`, `barcode`, `title`
- `category`, `maker`, `material`, `era`, `dimensions`, `condition`, `tags`
- `cost_cents`, `price_cents`, `ask_for_price`
- `quantity`, `status`, `location`
- `created_at`, `updated_at`

Prices are integer cents. `ask_for_price` true means the shop is not showing a public price. Add `?format=csv` to the same URL for the CSV, with the same bearer token.

The API is read-only. Sales in another system do not write back into the shop desk yet.
