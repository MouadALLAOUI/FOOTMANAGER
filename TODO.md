# TODO

## admin

- [ ] when i change the User management page to another one it won't show that page data until i refresh the page.

## terrain

- [x] calendar need better ui
- [x] editing terrain need to remove facilities that work with radio btn and keep only the ones that it get from backend
- [x] in my fields page, on the terrain card remove the open calendar button keep only edit and suspend buttons and the more '...' button that will open a menu with delete option.
- [x] in overview page, Your fields section, show this error when trigger the radio btn 'App\Http\Controllers\Terrain\OwnerTerrainController::toggleStatus(): Argument #2 ($id) must be of type int, string given, called in C:\Users\mouad\Desktop\FootMANAGER\backend\vendor\laravel\framework\src\Illuminate\Routing\ControllerDispatcher.php on line 46'
- [x] for my fields page, when setting up an image i got this error "The images.0 field must be an image. (and 1 more error)".
- [x] in booking page, booking data are duplicated, need to fix it.
- [x] in booking page, when the user click on the booking card, it should open a modal with the booking details instead of redirecting to another page.
- [x] in booking page, when refusing a booking, it should be removed from the list of bookings.
- [x] in calendar page, when checking the reservation details, the user can see the manager profile ( name ,  phone number, email, and the manager profile pic).
- [ ] cannot close a terrain if it has a reservation on it. need to show a message to the user that he cannot close the terrain because it has a reservation on it. and it need to contact the manager to cancel the reservation or change the date of the reservation.
- [ ] terrain owner can create reservation for non users (guest users) and send them the reservation details by email or sms. (need to add a new input for the guest user email or phone number in the reservation form).
- [x] in overview page, the chart take too much time to load, need to optimize it.
- [ ] the overview page, can allow the user to do any task without switching to other pages lightly.
- [ ] for profile page, the user should be able to set a pic for his profile.

## manager

- [x] creating a match should use the the timepicker components for hour selection.
- [x] creating a match doesn't need an end time input.
- [x] create a match doesn't need price per player input.
- [x] for my match after accepting a match it disappear and i cannot find it anywhere.
- [x] my booking page, it shouldn't show past bookings, only the upcoming ones.
- [x] add need a player when starting a match or accepting a match,

## player

- [ ] need a new dashboard design for the player.
- [ ] overview page, should have all action that the player can do without switching to other pages.
- [ ] add a way to form a team for the player by posting a request to form a team with other players. or manager.

## committee

- [ ] creating tournement ask for teams count and teams per group, number of group isn't needed (can be free grouping).
- [ ] tournement should have a new state (open for registration) before starting the tournement. (addings new input in creation form for registration start and end date)
- [ ] tournement should have have regestration start and end date, regestration fees, and rules and regulations. (adding a new tabs for tournement before the teams tab).
- [ ] adding to settings a new section for tournement settings (regestration fees, rules and regulations, and regestration start and end date).
- [ ] in tournement page, at draw tab. it have two auto draw buttons. also it should show only one group container and once a team is added it show the next group container empty, and if filled it show the next group container empty and so on until all groups are filled. (free mode)
- [ ] for fixed mode it show all avaible groups containers and the user can add teams to any group container.
- [ ] for matchs tab, generating fixture modal at Default time input should be changed to the timepicker component.
- [ ] for HOST staduims it should show only stade that support tournement in thier facilities.
- [ ] enter result modal still need to much work for next.
- [ ] round 2 stay locked even if all matchs are finished in round 1.
- [ ] also i need to add a tourneent landing page system. that allow the committee to create a landing page for the tournement with all the details and the teams and the matchs and the results and the standings and the scorers and the news and the gallery and the sponsors and the partners and the social media links and the contact us form.
- [ ] committee can print the tournement details and the teams and the matchs and the results and the standings and the scorers and the news and the gallery and the sponsors and the partners and the social media links and the contact us form.

## general

- [ ] all roles should connect to each other. for example if a tournement is created on a terrain, the terrain should be reserved and for that tournement (only the time of matchs if not the terrain is free). also a player cannot be in two match, etc
- [ ] landing page should have a tournement section to show avaible tournements.
- [ ] guest user can see evrything on landing page but if they want to register for a tournement or reserve a terrain they should be redirected to the login page or but before show the manager or terrain owner or committee phone number and email depend on the wanted service.
- [ ] the search in landing page uses raw city data it should be from db, same terrain and teams need to have an fk to city table.
- [ ] need to add about us page and contact us page and terms and conditions page and privacy policy page. can access them from the footer of the landing page.
- [ ] for pricing page, it should have a new design and it should show the features of each plan and the price and the duration and the payment methods and the terms and conditions and the privacy policy.
- [ ] i18n some text still use raw data (text in arabic when selecting english) or (text in english when selecting arabic)

## landing page

- [x] closed terrain should not be shown in the landing page.
- [x] add functionment to the book now btn of terrain so if logged in open a modal for booking depend on role (player or manager) and if not logged in redirect to login page. same for 'Send match request' btn for matchs
