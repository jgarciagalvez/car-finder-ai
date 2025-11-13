Here are the things I need to change about the app:


* Location: I don't know Poland, so the actual location we showcase is not that helpful for me. It would be good to show how close/far it is from Wroclaw. Adding a google map embed on the car detail page would also be helpful.

* Features on dashboard view: I want to see all features in the dashboard card. Maybe we can do that the (+N more) could be a button that expands/contract the features?

* Sorting: right now, we can sort by different properties, but I feel like they are not "stacked" sorting. So, for example, if I sort by price low to high, and then by priority high to low, the high to low sort should also be sorted by price low to high... not sure if you know what I mean.

* Scrolling all vehicles: when I scroll down to show all vehicles, there is a moment where the app crashes (like the error we had before we implemented the lazy loading). 

* Hide "Deleted" cars: if a car is marked as "Deleted", it should be filtered out from the list, and only be visible if filtered by "Deleted"

* We should have different status for cars that have been skiped and those that have been processed and have AI summary, priority, etc.

## Vehicle Card Page

* Images: they are viewed in a fixed size, regardless of the actual size, which makes them now show complete. Let's have them square (smaller - same height as now). and have a superposed image viewer if clicked on them. 
  - On the right side empty place, we could add the scores. Note: personal fit score should be N/10 instead of N/100

* Missing location info and link to Otomoto under the name of the car.

* My Workflow. Should be visible as you scroll? Maybe have a sidebar (only in text part, not on image + scores). Or maybe have the scores also visible all the time?

* Virtual Mechanic's Report: the rendering is really bad. Everything is packed and difficult to read. Also, I think the report is way too detailed. I was more looking for a quick opinion on the car, not an exhaustive report. This is something I would be able to do with the Assistant, or maybe be have on a separate section. On this section I would like:
  - This model and engine is known for _____
  - Main issues are ___
  - Based on the description, it seems like ___
Basically I am looking for a good overview of wether it is a good engine, good model and if there are any serious issues mentioned in the description.

* Features should also be a bit higher in the view.

## Other issues and questions
* Right now I don't have a way to check if the vehicle has been removed from otomoto. So I might be looking at a car that has already been removed

* It takes a very long time to process a car. I would like to re-scrape completely, but I am afraid it takes a lot of time. Basically once we get the AI analysis right (with the virtual mechanic, etc), I would like to re-run the scrap and analysis, to have a fresh database. But, I don't want to spend that much time as the previous time (it took about 4 hours to process all cars)

* Are we always checking for duplicates based on URL? If I run a URL scrap that is wroclaw +50km, but then when I see that maybe there are not enough cars and I re-run it with wroclaw +100km, would it properly scrap and add to the database the new vehicles (without adding the ones already scrapped in the previous run)?



🎴 Dashboard Card Improvements
This is where my question about whether should we implement a "save / discard" button for when we make a change in the dashboard.
What about if I make a change in the detail page? Would it update the dashboard as well?

🔢 Multi-Level Sorting
Yes

🔍 Status Check
Could we also add it in the dashboard? And have a background process that checks all non-deleted vehicles? we don't have that many cars anyway, it should be fast.

⚡ Performance Question
* Is there a way to run some works in paralell? Like analysing 3 o 4 vehicles at the same time?

📋 Epic Structure
* Sounds good. Let's try to make the stories as complete as possible. Not create a story for a simple change in UX (unless it is really necessary)

Your other questions:
2. Virtual Mechanic Report:
    - It should be in different tab/sections
    - Both should be editable and stored in the database
3. Status:
Do we really need "new"? Or, better question: do we need it in the dropdown in the UI? this is probably only when scrapped, but once scrapped, the app would either process it or skip it.
- Regarding the "removed_from_source": if I have been "working" on that car, I would still want to view it, so not sure I want to change the "visited" status. Maybe it should be a new field, that would appear in big on top of the status? or besides the name? 


