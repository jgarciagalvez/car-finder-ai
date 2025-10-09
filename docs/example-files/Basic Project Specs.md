Ok, I am ok with the Transit. No Vito as it is more expensive.

I am planning to build an app for myself to go scrap the different auto dealers (I tried and I can scrap them), to be able to get all the info from the different vans they have, filter with my own requirements, and to get AI to help me do a first review of the van.

Can you help me with a good prompt to add in firebase studio to help me create this?

Things I will need:

* URL builder: we need to make sure the app goes to the search page and crawls an already filtered view. For example:
    - Otomoto: https://www.otomoto.pl/osobowe/renault/trafic/wroclaw?search%5Bdist%5D=300&search%5Bfilter_float_engine_capacity%3Ato%5D=2500&search%5Bfilter_float_year%3Ato%5D=2012&search%5Blat%5D=51.10195&search%5Blon%5D=17.03667&search%5Border%5D=created_at_first%3Adesc
    - Olx: https://www.olx.pl/motoryzacja/samochody/renault/wroclaw/?search%5Bdist%5D=100&search%5Bfilter_enum_model%5D%5B0%5D=trafic&search%5Bfilter_float_year:to%5D=2014&search%5Bfilter_float_enginesize:to%5D=2200
    
* URL scraper: first to scrap all the results from the search urls (with pagination), and then to go to each result and scrap the html and details of each one.

* Some way of poundering the results:
    - Year, kilometers and price are related: try to find the good deals (low price, low kilometers, less years)
    - Preference for tailgate rather than doors
    - Non-negotiable: Air-con, seats (non cargo. Not always specified on the description)
    - Distance from Wroclaw
    - Company preferred than private seller
    - Tainted windows (and having windows in the back)
    
* Standarisation of data (years, km, etc) between the two source sites, as well as deduplication (if a van is in both, have both urls added). Have also Original price and EUR conversion

* LLM review: have an llm review the pictures and description to see if a van fits the requiremens I am looking for and if it looks good. Also to check things like no separation between front and rear, seats, etc.

* UI: I want a UI where I can have my own "Otomoto" with the scrapped vans, and I could go into each van, or have a summary of all the vans ordered. Things I would like to have:
    - All pictures in both the all vans page, and the individual (able to pass the pictures in the all vans)
    - Pondered punctuation: based on my criteria, how well it is.
    - English description (translation from the original)
    - Comments section (where I can add my comments and what I think about it)
    - Selection dropdown: Deleted, To contact, contacted, to visit, visited (maybe something else)
    - Within the specific van page, have a "conversation" area where I can ask an LLM to create a message to the seller (in Polish) and where I can paste the replies of the seller for translation and reply suggestions
    - I also would like a "chat" where I can discuss with the LLM if this is a good price, good oportunity, etc.
    
* Any other ideas of things I could have?



