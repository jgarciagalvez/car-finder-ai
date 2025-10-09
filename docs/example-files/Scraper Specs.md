# Specification for Otomoto.pl Scraper

This document outlines the scraping strategy for both the main search results page and individual car advertisement pages on Otomoto.pl. The primary method for both is parsing the JSON data contained within the `<script id="__NEXT_DATA__">` tag.

---

## Part 1: Main Search Results Page (Listing Page)

### Objective
Scrape the list of car advertisements from a search results page, including the URL for each ad, to enable further scraping of individual pages. This process must handle pagination to cover all search results.

### Data Access Workflow
1.  **Locate Data Source**: Find the `<script id="__NEXT_DATA__">` tag in the page's HTML.
2.  **Parse Primary JSON**: Parse the content of this script tag as a JSON object.
3.  **Navigate to Data Object**: Access the object at the path `props.pageProps.urqlState`.
4.  **Find Dynamic Key**: The `urqlState` object contains keys that are dynamic query hashes. Iterate through the keys and find the one whose value contains a `data` property.
5.  **Parse Secondary JSON**: The `data` property is a stringified JSON. Parse this string to get the final data object.
6.  **Access Ad List**: The list of ads is in an array at the path `advertSearch.edges`.

### Ad Data Extraction (per item in `advertSearch.edges`)

| Field | JSON Path | Logic |
|---|---|---|
| `ad_name` | `node.title` | Direct value. |
| `ad_url` | `node.url` | Direct value. |
| `created_at` | `node.createdAt` | Direct value. |

### Pagination Logic
Extract the following from the secondary JSON object (`advertSearch`):

1.  **Total Ad Count**: `totalCount` (e.g., `352`)
2.  **Ads Per Page**: `pageInfo.pageSize` (e.g., `32`)
3.  **Calculate Total Pages**: `totalPages = Math.ceil(totalCount / pageSize)`
4.  **Iterate**: Loop from page 2 to `totalPages`. Construct the URL for each page by appending `&page={page_number}` to the base search URL.

---

## Part 2: Individual Car Advertisement Page (Details Page)

### Objective
Scrape all available details for a single car from its advertisement page.

### Data Access Workflow
1.  **Locate Data Source**: Find the `<script id="__NEXT_DATA__">` tag in the page's HTML.
2.  **Parse JSON**: Parse the content of this script tag as a JSON object.
3.  **Access Main Ad Object**: All required data is within the object at the path `props.pageProps.advert`.

### Data Extraction Schema & Logic
For each ad page, create a single JSON object. All paths below are relative to the `props.pageProps.advert` object.

#### **A. Main Information**

| Field | JSON Path | Data Type |
|---|---|---|
| `id` | `id` | String |
| `title` | `title` | String |
| `url` | `url` | String |
| `price_pln` | `price.value` | String/Float |
| `price_currency` | `price.currency` | String |
| `description_html`| `description` | String |
| `created_at`| `createdAt` | String |

#### **B. Seller Information**

| Field | JSON Path | Data Type | Logic |
|---|---|---|---|
| `seller_name` | `seller.name` | String | |
| `seller_id` | `seller.id` | String | |
| `seller_type` | `seller.type` | String | e.g., `PRIVATE` |
| `seller_location` | `seller.location.address` | String | |
| `member_since` | `seller.featuresBadges` | String | Find object where `code` is `registration-date`, get `label`. |

#### **C. Vehicle Parameters**

- **Source Array**: `details`
- **Logic**: Create a key-value object. Iterate through the `details` array. For each item, the key is `item.label` and the value is `item.value`.

#### **D. Vehicle Equipment**

- **Source Array**: `equipment`
- **Logic**: Create a key-value object where keys are equipment categories. Iterate through the `equipment` array. For each item, the key is `item.label`. The value is an array of strings, created by iterating through `item.values` and extracting the `label` from each object.

#### **E. Image URLs**

- **Source Array**: `images.photos`
- **Logic**: Create an array of strings. Iterate through the `images.photos` array and extract the `url` from each object.

### Final Output Structure (Example for a single ad page)
```json
{
  "id": "6142208003",
  "title": "Ford Transit Custom 320 L2H2 VA Trend",
  "url": "[https://www.otomoto.pl/osobowe/oferta/ford-transit-custom-ID6HG4T1.html](https://www.otomoto.pl/osobowe/oferta/ford-transit-custom-ID6HG4T1.html)",
  "created_at": "2025-09-28T13:11:56Z",
  "price_pln": "70725",
  "price_currency": "PLN",
  "description_html": "<p>Witam mam do sprzedania...</p>",
  "seller": {
    "name": "paweł",
    "id": "1915462",
    "type": "PRIVATE",
    "location": "Częstochowa, Lisiniec",
    "member_since": "Sprzedający na OTOMOTO od 2015"
  },
  "parameters": {
    "Marka pojazdu": "Ford",
    "Model pojazdu": "Transit Custom",
    "Rok produkcji": "2017",
    "Przebieg": "78 000 km",
    "Pojemność skokowa": "1 996 cm3"
  },
  "equipment": {
    "Audio i multimedia": [
      "Interfejs Bluetooth",
      "Radio"
    ],
    "Komfort i dodatki": [
      "Hak",
      "Klimatyzacja manualna"
    ]
  },
  "image_urls": [
    "[https://ireland.apollo.olxcdn.com/v1/files/](https://ireland.apollo.olxcdn.com/v1/files/)...",
    "[https://ireland.apollo.olxcdn.com/v1/files/](https://ireland.apollo.olxcdn.com/v1/files/)..."
  ]
}
```

cv_details!$P:$P,"partybackpackers"