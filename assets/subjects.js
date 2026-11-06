/* ==========================================================================
   Subject library — one compact model per system, from which every diagram
   type is generated. Pick a type + a subject and the spec text is written
   for you; the builder's parser and renderers take it from there.
   ========================================================================== */
window.SUBJECTS = (function () {
  'use strict';

  /* ---------------------------------------------------------------- data */
  var S = [

  /* ====================== 1. LIBRARY ====================== */
  {
    id: 'library', name: 'Library Management System', sys: 'Library System',
    actors: [
      { n: 'Member', uc: ['Register / Login', 'Search Catalog', 'Reserve Book', 'Issue Book', 'Return Book'] },
      { n: 'Librarian', uc: ['Manage Members', 'Add / Update Book', 'Issue Book', 'Return Book', 'Generate Reports'] },
      { n: 'Supplier', uc: ['Supply Books'] }
    ],
    ctx: [
      { a: 'Member', i: 'Search / borrow / return request', o: 'Book status, issue slip, fine' },
      { a: 'Librarian', i: 'Manage books & members', o: 'Reports & records' },
      { a: 'Supplier', i: 'Book supply', o: 'Purchase order' }
    ],
    proc: [['1.0', 'Manage Membership'], ['2.0', 'Search Catalog'], ['3.0', 'Issue Book'],
           ['4.0', 'Return Book & Fine'], ['5.0', 'Maintain Catalog']],
    store: [['D1', 'Member DB'], ['D2', 'Book Catalog DB'], ['D3', 'Issue DB'], ['D4', 'Fine DB']],
    flow: [['Member', '1.0', 'Registration details'], ['1.0', 'Member', 'Confirmation'],
           ['1.0', 'D1', 'Member record'], ['Member', '2.0', 'Search query'],
           ['D2', '2.0', 'Book info'], ['2.0', 'Member', 'Search results'],
           ['Member', '3.0', 'Borrow request'], ['D1', '3.0', 'Member status'],
           ['D2', '3.0', 'Availability'], ['3.0', 'D3', 'Issue record'],
           ['3.0', 'Member', 'Issue slip & due date'], ['Librarian', '3.0', 'Approve issue'],
           ['Member', '4.0', 'Return book'], ['D3', '4.0', 'Loan record'],
           ['4.0', 'D4', 'Fine record'], ['4.0', 'Member', 'Fine notice / receipt'],
           ['Librarian', '5.0', 'Add / update book'], ['5.0', 'D2', 'Catalog update'],
           ['Supplier', '5.0', 'Book supply'], ['5.0', 'Supplier', 'Purchase order']],
    inc: [['Issue Book', 'Check Availability']], ext: [['Pay Fine', 'Return Book']],
    cls: [
      { n: 'User', abs: 1, a: ['- userId : int', '- name : String', '- email : String'], m: ['+ login()', '+ logout()'] },
      { n: 'Member', a: ['- memberId : int', '- membershipDate : Date', '- booksIssued : int'], m: ['+ searchBook()', '+ borrowBook()', '+ payFine()'] },
      { n: 'Librarian', a: ['- staffId : int', '- designation : String'], m: ['+ addBook()', '+ issueBook()', '+ collectFine()'] },
      { n: 'Book', a: ['- bookId : int', '- title : String', '- author : String', '- ISBN : String'], m: ['+ getDetails()'] },
      { n: 'BookCopy', a: ['- copyId : int', '- status : String', '- rackNo : String'], m: ['+ setStatus()'] },
      { n: 'IssueRecord', a: ['- issueId : int', '- issueDate : Date', '- dueDate : Date'], m: ['+ checkOverdue()'] },
      { n: 'Fine', a: ['- fineId : int', '- amount : double', '- status : String'], m: ['+ calculateFine()'] }
    ],
    rel: [['inherit', 'Member', 'User'], ['inherit', 'Librarian', 'User'],
          ['assoc', 'Member', 'IssueRecord', 'borrows', '1,*'],
          ['assoc', 'IssueRecord', 'Fine', 'incurs', '1,0..1'],
          ['assoc', 'IssueRecord', 'BookCopy', 'refers to', '*,1'],
          ['compose', 'Book', 'BookCopy', 'has copies', '1,1..*']],
    seq: {
      t: 'Issue Book',
      p: [['Member', 1], [':LibrarySystem', 0], [':Catalog', 0], [':IssueRecord', 0]],
      m: [['c', 'Member', ':LibrarySystem', 'requestIssue(bookId)'],
          ['c', ':LibrarySystem', ':Catalog', 'checkAvailability(bookId)'],
          ['r', ':Catalog', ':LibrarySystem', 'copy available'],
          ['c', ':LibrarySystem', ':IssueRecord', 'createIssue(memberId, copyId)'],
          ['r', ':IssueRecord', ':LibrarySystem', 'issueId + dueDate'],
          ['c', ':LibrarySystem', ':Catalog', 'updateStatus(issued)'],
          ['r', ':LibrarySystem', 'Member', 'issue slip + due date']]
    },
    act: [['start'], ['action', 'Login to the system'], ['decision', 'Valid member?'],
          ['else', 'Show error message'], ['action', 'Search the catalogue'],
          ['action', 'Select a book'], ['decision', 'Copy available?'],
          ['else', 'Reserve the book'], ['action', 'Issue the copy'],
          ['action', 'Print issue slip'], ['end']],
    st: { s: ['Available', 'Reserved', 'Issued', 'Overdue', 'Lost'], init: 'Available', fin: 'Lost',
          t: [['Available', 'Reserved', 'reserve()'], ['Reserved', 'Issued', 'collect()'],
              ['Available', 'Issued', 'issueBook()'], ['Issued', 'Available', 'returnBook()'],
              ['Issued', 'Overdue', 'dueDate passed'], ['Overdue', 'Available', 'returnBook() + payFine()'],
              ['Overdue', 'Lost', 'declared lost']] }
  },

  /* ====================== 2. FOOD DELIVERY ====================== */
  {
    id: 'food', name: 'Online Food Delivery System', sys: 'Food Delivery System',
    actors: [
      { n: 'Customer', uc: ['Register / Login', 'Browse Menu', 'Place Order', 'Track Order', 'Rate & Review'] },
      { n: 'Restaurant', uc: ['Manage Menu', 'Accept / Reject Order', 'Update Food Status'] },
      { n: 'Delivery Agent', uc: ['View Assigned Orders', 'Update Delivery Status'] },
      { n: 'Payment Gateway', uc: ['Make Payment'] }
    ],
    ctx: [
      { a: 'Customer', i: 'Order & payment details', o: 'Confirmation & order status' },
      { a: 'Restaurant', i: 'Menu & food status', o: 'Order details' },
      { a: 'Delivery Agent', i: 'Delivery status', o: 'Delivery assignment' },
      { a: 'Payment Gateway', i: 'Payment confirmation', o: 'Payment request' }
    ],
    proc: [['1.0', 'Register / Login'], ['2.0', 'Place Order & Browse Menu'],
           ['3.0', 'Process Payment'], ['4.0', 'Assign & Track Delivery']],
    store: [['D1', 'User DB'], ['D2', 'Menu DB'], ['D3', 'Order DB'], ['D4', 'Payment DB']],
    flow: [['Customer', '1.0', 'Login info'], ['1.0', 'D1', 'User record'],
           ['Customer', '2.0', 'Order request'], ['D2', '2.0', 'Menu query'],
           ['2.0', 'Customer', 'Menu & confirmation'], ['Restaurant', '2.0', 'Menu & order accept'],
           ['2.0', 'Restaurant', 'New order'], ['2.0', 'D3', 'Order record'],
           ['2.0', '3.0', 'Order amount'], ['3.0', 'D4', 'Txn record'],
           ['3.0', '4.0', 'Paid order'], ['4.0', 'D3', 'Status update'],
           ['4.0', 'Delivery Agent', 'Assign'], ['Delivery Agent', '4.0', 'Delivery status'],
           ['4.0', 'Customer', 'Order tracking']],
    inc: [['Place Order', 'Make Payment']], ext: [['Apply Coupon', 'Place Order']],
    cls: [
      { n: 'User', abs: 1, a: ['- userId : int', '- name : String', '- phone : String'], m: ['+ login()', '+ logout()'] },
      { n: 'Customer', a: ['- customerId : int', '- deliveryAddress : String'], m: ['+ placeOrder()', '+ trackOrder()'] },
      { n: 'DeliveryAgent', a: ['- agentId : int', '- vehicleNo : String'], m: ['+ updateDeliveryStatus()'] },
      { n: 'Restaurant', a: ['- restaurantId : int', '- name : String', '- rating : double'], m: ['+ acceptOrder()'] },
      { n: 'MenuItem', a: ['- itemId : int', '- name : String', '- price : double'], m: ['+ updatePrice()'] },
      { n: 'Order', a: ['- orderId : int', '- orderDate : Date', '- totalAmount : double'], m: ['+ calculateTotal()'] },
      { n: 'OrderItem', a: ['- quantity : int', '- subtotal : double'], m: ['+ calculateSubtotal()'] },
      { n: 'Payment', a: ['- paymentId : int', '- amount : double', '- paymentMode : String'], m: ['+ processPayment()'] }
    ],
    rel: [['inherit', 'Customer', 'User'], ['inherit', 'DeliveryAgent', 'User'],
          ['assoc', 'Customer', 'Order', 'places', '1,*'],
          ['assoc', 'Order', 'Payment', 'has', '1,1'],
          ['assoc', 'Order', 'Restaurant', 'placed at', '*,1'],
          ['compose', 'Order', 'OrderItem', 'contains', '1,1..*'],
          ['compose', 'Restaurant', 'MenuItem', 'offers', '1,1..*']],
    seq: {
      t: 'Place Order',
      p: [['Customer', 1], [':FoodDeliveryApp', 0], [':Restaurant', 0], [':PaymentGateway', 0]],
      m: [['c', 'Customer', ':FoodDeliveryApp', 'browseMenu()'],
          ['c', ':FoodDeliveryApp', ':Restaurant', 'getMenu()'],
          ['r', ':Restaurant', ':FoodDeliveryApp', 'menu list'],
          ['c', 'Customer', ':FoodDeliveryApp', 'placeOrder(items)'],
          ['c', ':FoodDeliveryApp', ':PaymentGateway', 'processPayment(amount)'],
          ['r', ':PaymentGateway', ':FoodDeliveryApp', 'paymentSuccess'],
          ['c', ':FoodDeliveryApp', ':Restaurant', 'confirmOrder()'],
          ['r', ':Restaurant', ':FoodDeliveryApp', 'orderAccepted'],
          ['r', ':FoodDeliveryApp', 'Customer', 'orderConfirmed + tracking']]
    },
    act: [['start'], ['action', 'Browse restaurants'], ['action', 'Add items to cart'],
          ['decision', 'Cart empty?'], ['else', 'Add more items'], ['action', 'Checkout'],
          ['decision', 'Payment successful?'], ['else', 'Retry payment'],
          ['action', 'Restaurant prepares food'], ['action', 'Agent delivers order'], ['end']],
    st: { s: ['Placed', 'Accepted', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'],
          init: 'Placed', fin: 'Delivered',
          t: [['Placed', 'Accepted', 'acceptOrder()'], ['Placed', 'Cancelled', 'rejectOrder()'],
              ['Accepted', 'Preparing', 'startCooking()'], ['Preparing', 'Out for Delivery', 'handToAgent()'],
              ['Out for Delivery', 'Delivered', 'confirmDelivery()'], ['Accepted', 'Cancelled', 'cancelOrder()']] }
  },

  /* ====================== 3. ATM ====================== */
  {
    id: 'atm', name: 'ATM System', sys: 'ATM System',
    actors: [
      { n: 'Customer', uc: ['Insert Card', 'Enter PIN', 'Withdraw Cash', 'Deposit Cash', 'Check Balance', 'Transfer Funds', 'Print Receipt'] },
      { n: 'Bank Server', uc: ['Validate Account', 'Update Balance'] },
      { n: 'Technician', uc: ['Refill Cash', 'Maintain Machine'] }
    ],
    ctx: [
      { a: 'Customer', i: 'Card, PIN, transaction request', o: 'Cash, receipt, balance' },
      { a: 'Bank Server', i: 'Account validation & balance', o: 'Transaction request' },
      { a: 'Technician', i: 'Maintenance input', o: 'Machine status' }
    ],
    proc: [['1.0', 'Authenticate Card'], ['2.0', 'Validate PIN'], ['3.0', 'Process Transaction'],
           ['4.0', 'Dispense Cash'], ['5.0', 'Print Receipt']],
    store: [['D1', 'Card DB'], ['D2', 'Account DB'], ['D3', 'Transaction Log']],
    flow: [['Customer', '1.0', 'Card details'], ['D1', '1.0', 'Card record'],
           ['1.0', '2.0', 'Valid card'], ['Customer', '2.0', 'PIN'],
           ['D2', '2.0', 'Account details'], ['2.0', 'Customer', 'Auth result'],
           ['Customer', '3.0', 'Transaction request'], ['D2', '3.0', 'Balance'],
           ['3.0', 'D2', 'Updated balance'], ['3.0', 'D3', 'Transaction record'],
           ['3.0', '4.0', 'Dispense instruction'], ['4.0', 'Customer', 'Cash'],
           ['3.0', '5.0', 'Receipt data'], ['5.0', 'Customer', 'Receipt'],
           ['Bank Server', '3.0', 'Authorisation'], ['3.0', 'Bank Server', 'Debit request']],
    inc: [['Withdraw Cash', 'Enter PIN']], ext: [['Print Receipt', 'Withdraw Cash']],
    cls: [
      { n: 'Customer', a: ['- customerId : int', '- name : String', '- address : String'], m: ['+ insertCard()'] },
      { n: 'Card', a: ['- cardNo : String', '- pin : int', '- expiryDate : Date'], m: ['+ validatePin()'] },
      { n: 'Account', a: ['- accountNo : String', '- accountType : String', '- balance : double'], m: ['+ withdraw()', '+ deposit()'] },
      { n: 'ATM', a: ['- atmId : int', '- location : String', '- cashAvailable : double'], m: ['+ dispenseCash()'] },
      { n: 'Transaction', a: ['- txnId : int', '- txnType : String', '- amount : double', '- txnDate : Date'], m: ['+ execute()'] },
      { n: 'Receipt', a: ['- receiptNo : int', '- printedOn : Date'], m: ['+ print()'] }
    ],
    rel: [['assoc', 'Customer', 'Card', 'holds', '1,1..*'],
          ['assoc', 'Card', 'Account', 'linked to', '1,1'],
          ['assoc', 'Account', 'Transaction', 'records', '1,*'],
          ['assoc', 'ATM', 'Transaction', 'performs', '1,*'],
          ['compose', 'Transaction', 'Receipt', 'generates', '1,0..1']],
    seq: {
      t: 'Withdraw Cash',
      p: [['Customer', 1], [':ATM', 0], [':Card', 0], [':BankServer', 0], [':Account', 0]],
      m: [['c', 'Customer', ':ATM', 'insertCard()'],
          ['c', ':ATM', ':Card', 'readCard()'],
          ['r', ':Card', ':ATM', 'card details'],
          ['c', 'Customer', ':ATM', 'enterPin(pin)'],
          ['c', ':ATM', ':BankServer', 'validatePin(cardNo, pin)'],
          ['r', ':BankServer', ':ATM', 'authenticated'],
          ['c', 'Customer', ':ATM', 'withdraw(amount)'],
          ['c', ':ATM', ':Account', 'debit(amount)'],
          ['r', ':Account', ':ATM', 'new balance'],
          ['r', ':ATM', 'Customer', 'cash + receipt']]
    },
    act: [['start'], ['action', 'Insert card'], ['action', 'Enter PIN'],
          ['decision', 'PIN correct?'], ['else', 'Retry PIN'], ['action', 'Select transaction'],
          ['action', 'Enter amount'], ['decision', 'Sufficient balance?'],
          ['else', 'Show insufficient funds'], ['action', 'Dispense cash'],
          ['action', 'Print receipt'], ['end']],
    st: { s: ['Idle', 'Card Inserted', 'Authenticating', 'Ready', 'Dispensing', 'Ejecting Card'],
          init: 'Idle', fin: 'Idle',
          t: [['Idle', 'Card Inserted', 'insertCard()'], ['Card Inserted', 'Authenticating', 'enterPin()'],
              ['Authenticating', 'Ready', 'pin valid'], ['Authenticating', 'Ejecting Card', 'pin invalid'],
              ['Ready', 'Dispensing', 'withdraw()'], ['Dispensing', 'Ejecting Card', 'cash taken'],
              ['Ejecting Card', 'Idle', 'card removed']] }
  },

  /* ====================== 4. HOSPITAL ====================== */
  {
    id: 'hospital', name: 'Hospital Management System', sys: 'Hospital System',
    actors: [
      { n: 'Patient', uc: ['Register', 'Book Appointment', 'View Prescription', 'Pay Bill'] },
      { n: 'Doctor', uc: ['View Appointments', 'Diagnose Patient', 'Write Prescription'] },
      { n: 'Receptionist', uc: ['Register', 'Book Appointment', 'Generate Bill'] },
      { n: 'Lab Technician', uc: ['Conduct Test', 'Upload Test Report'] }
    ],
    ctx: [
      { a: 'Patient', i: 'Registration & appointment request', o: 'Appointment slip, prescription, bill' },
      { a: 'Doctor', i: 'Diagnosis & prescription', o: 'Patient history & schedule' },
      { a: 'Receptionist', i: 'Patient & billing details', o: 'Records & receipts' },
      { a: 'Lab Technician', i: 'Test report', o: 'Test request' }
    ],
    proc: [['1.0', 'Register Patient'], ['2.0', 'Book Appointment'], ['3.0', 'Record Diagnosis'],
           ['4.0', 'Conduct Lab Test'], ['5.0', 'Generate Bill']],
    store: [['D1', 'Patient DB'], ['D2', 'Appointment DB'], ['D3', 'Prescription DB'], ['D4', 'Billing DB']],
    flow: [['Patient', '1.0', 'Personal details'], ['1.0', 'D1', 'Patient record'],
           ['1.0', 'Patient', 'Patient ID'], ['Patient', '2.0', 'Appointment request'],
           ['D1', '2.0', 'Patient info'], ['2.0', 'D2', 'Appointment record'],
           ['2.0', 'Patient', 'Appointment slip'], ['Doctor', '3.0', 'Diagnosis'],
           ['D2', '3.0', 'Appointment details'], ['3.0', 'D3', 'Prescription record'],
           ['3.0', 'Patient', 'Prescription'], ['Doctor', '4.0', 'Test request'],
           ['Lab Technician', '4.0', 'Test report'], ['4.0', 'D3', 'Report record'],
           ['Receptionist', '5.0', 'Billing details'], ['D3', '5.0', 'Treatment details'],
           ['5.0', 'D4', 'Bill record'], ['5.0', 'Patient', 'Bill / receipt']],
    inc: [['Book Appointment', 'Register']], ext: [['Conduct Test', 'Diagnose Patient']],
    cls: [
      { n: 'Person', abs: 1, a: ['- id : int', '- name : String', '- phone : String'], m: ['+ getDetails()'] },
      { n: 'Patient', a: ['- patientId : int', '- age : int', '- bloodGroup : String'], m: ['+ bookAppointment()'] },
      { n: 'Doctor', a: ['- doctorId : int', '- specialisation : String', '- fees : double'], m: ['+ diagnose()'] },
      { n: 'Appointment', a: ['- apptId : int', '- apptDate : Date', '- status : String'], m: ['+ schedule()', '+ cancel()'] },
      { n: 'Prescription', a: ['- prescId : int', '- medicines : String', '- advice : String'], m: ['+ generate()'] },
      { n: 'LabTest', a: ['- testId : int', '- testName : String', '- result : String'], m: ['+ uploadResult()'] },
      { n: 'Bill', a: ['- billId : int', '- amount : double', '- paidOn : Date'], m: ['+ calculateTotal()'] }
    ],
    rel: [['inherit', 'Patient', 'Person'], ['inherit', 'Doctor', 'Person'],
          ['assoc', 'Patient', 'Appointment', 'books', '1,*'],
          ['assoc', 'Doctor', 'Appointment', 'attends', '1,*'],
          ['compose', 'Appointment', 'Prescription', 'produces', '1,0..1'],
          ['assoc', 'Prescription', 'LabTest', 'orders', '1,*'],
          ['assoc', 'Patient', 'Bill', 'pays', '1,*']],
    seq: {
      t: 'Book Appointment',
      p: [['Patient', 1], [':HospitalSystem', 0], [':PatientRecord', 0], [':Appointment', 0]],
      m: [['c', 'Patient', ':HospitalSystem', 'requestAppointment(doctor, date)'],
          ['c', ':HospitalSystem', ':PatientRecord', 'verifyPatient(patientId)'],
          ['r', ':PatientRecord', ':HospitalSystem', 'patient valid'],
          ['c', ':HospitalSystem', ':Appointment', 'checkSlot(doctor, date)'],
          ['r', ':Appointment', ':HospitalSystem', 'slot free'],
          ['c', ':HospitalSystem', ':Appointment', 'schedule()'],
          ['r', ':Appointment', ':HospitalSystem', 'apptId'],
          ['r', ':HospitalSystem', 'Patient', 'appointment slip']]
    },
    act: [['start'], ['action', 'Register patient'], ['action', 'Select doctor & slot'],
          ['decision', 'Slot available?'], ['else', 'Choose another slot'],
          ['action', 'Confirm appointment'], ['action', 'Doctor diagnoses patient'],
          ['decision', 'Lab test needed?'], ['else', 'Conduct lab test'],
          ['action', 'Issue prescription'], ['action', 'Generate bill'], ['end']],
    st: { s: ['Requested', 'Scheduled', 'In Consultation', 'Completed', 'Cancelled'],
          init: 'Requested', fin: 'Completed',
          t: [['Requested', 'Scheduled', 'confirmSlot()'], ['Requested', 'Cancelled', 'noSlot()'],
              ['Scheduled', 'In Consultation', 'patientArrives()'],
              ['Scheduled', 'Cancelled', 'cancel()'],
              ['In Consultation', 'Completed', 'prescriptionIssued()']] }
  },

  /* ====================== 5. RAILWAY ====================== */
  {
    id: 'railway', name: 'Railway Reservation System', sys: 'Reservation System',
    actors: [
      { n: 'Passenger', uc: ['Register / Login', 'Search Train', 'Book Ticket', 'Cancel Ticket', 'Check PNR Status'] },
      { n: 'Reservation Clerk', uc: ['Book Ticket', 'Cancel Ticket', 'Generate Chart'] },
      { n: 'Payment Gateway', uc: ['Make Payment'] },
      { n: 'Administrator', uc: ['Manage Trains', 'Manage Schedule'] }
    ],
    ctx: [
      { a: 'Passenger', i: 'Journey & booking details', o: 'Ticket, PNR status, refund' },
      { a: 'Reservation Clerk', i: 'Counter booking request', o: 'Printed ticket & charts' },
      { a: 'Payment Gateway', i: 'Payment confirmation', o: 'Payment request' },
      { a: 'Administrator', i: 'Train & schedule data', o: 'Occupancy reports' }
    ],
    proc: [['1.0', 'Search Train'], ['2.0', 'Book Ticket'], ['3.0', 'Process Payment'],
           ['4.0', 'Cancel & Refund'], ['5.0', 'Manage Trains']],
    store: [['D1', 'Train DB'], ['D2', 'Seat Availability DB'], ['D3', 'Booking DB'], ['D4', 'Payment DB']],
    flow: [['Passenger', '1.0', 'Source, destination, date'], ['D1', '1.0', 'Train details'],
           ['1.0', 'Passenger', 'Train list'], ['Passenger', '2.0', 'Booking request'],
           ['D2', '2.0', 'Seat availability'], ['2.0', 'D2', 'Seat blocked'],
           ['2.0', 'D3', 'Booking record'], ['2.0', '3.0', 'Fare amount'],
           ['3.0', 'Payment Gateway', 'Payment request'], ['Payment Gateway', '3.0', 'Payment confirmation'],
           ['3.0', 'D4', 'Txn record'], ['3.0', 'Passenger', 'Ticket & PNR'],
           ['Passenger', '4.0', 'Cancellation request'], ['D3', '4.0', 'Booking details'],
           ['4.0', 'Passenger', 'Refund details'], ['Administrator', '5.0', 'Train & schedule'],
           ['5.0', 'D1', 'Train update']],
    inc: [['Book Ticket', 'Make Payment']], ext: [['Check PNR Status', 'Book Ticket']],
    cls: [
      { n: 'Passenger', a: ['- passengerId : int', '- name : String', '- age : int'], m: ['+ bookTicket()', '+ cancelTicket()'] },
      { n: 'Train', a: ['- trainNo : int', '- trainName : String', '- source : String', '- destination : String'], m: ['+ getSchedule()'] },
      { n: 'Coach', a: ['- coachNo : String', '- coachClass : String', '- totalSeats : int'], m: ['+ availableSeats()'] },
      { n: 'Booking', a: ['- pnr : String', '- journeyDate : Date', '- status : String', '- fare : double'], m: ['+ confirm()', '+ cancel()'] },
      { n: 'Ticket', a: ['- ticketNo : int', '- seatNo : String', '- berth : String'], m: ['+ print()'] },
      { n: 'Payment', a: ['- paymentId : int', '- amount : double', '- mode : String'], m: ['+ processPayment()', '+ refund()'] }
    ],
    rel: [['assoc', 'Passenger', 'Booking', 'makes', '1,*'],
          ['assoc', 'Booking', 'Train', 'for', '*,1'],
          ['compose', 'Train', 'Coach', 'has', '1,1..*'],
          ['compose', 'Booking', 'Ticket', 'issues', '1,1..*'],
          ['assoc', 'Booking', 'Payment', 'paid by', '1,1']],
    seq: {
      t: 'Book Ticket',
      p: [['Passenger', 1], [':ReservationSystem', 0], [':SeatManager', 0], [':PaymentGateway', 0]],
      m: [['c', 'Passenger', ':ReservationSystem', 'searchTrain(src, dest, date)'],
          ['r', ':ReservationSystem', 'Passenger', 'train list'],
          ['c', 'Passenger', ':ReservationSystem', 'bookTicket(trainNo, class)'],
          ['c', ':ReservationSystem', ':SeatManager', 'checkAvailability()'],
          ['r', ':SeatManager', ':ReservationSystem', 'seats available'],
          ['c', ':ReservationSystem', ':PaymentGateway', 'collectFare(amount)'],
          ['r', ':PaymentGateway', ':ReservationSystem', 'paymentSuccess'],
          ['c', ':ReservationSystem', ':SeatManager', 'allocateSeat()'],
          ['r', ':ReservationSystem', 'Passenger', 'ticket + PNR']]
    },
    act: [['start'], ['action', 'Enter journey details'], ['action', 'Search trains'],
          ['decision', 'Seats available?'], ['else', 'Join waiting list'],
          ['action', 'Enter passenger details'], ['action', 'Make payment'],
          ['decision', 'Payment successful?'], ['else', 'Release blocked seat'],
          ['action', 'Generate PNR & ticket'], ['end']],
    st: { s: ['Available', 'Blocked', 'Waiting', 'Confirmed', 'Cancelled'],
          init: 'Available', fin: 'Confirmed',
          t: [['Available', 'Blocked', 'selectSeat()'], ['Blocked', 'Confirmed', 'paymentSuccess()'],
              ['Blocked', 'Available', 'paymentFailed()'], ['Available', 'Waiting', 'noSeats()'],
              ['Waiting', 'Confirmed', 'seatReleased()'], ['Confirmed', 'Cancelled', 'cancelTicket()']] }
  },

  /* ====================== 6. ONLINE SHOPPING ====================== */
  {
    id: 'shopping', name: 'Online Shopping System', sys: 'Shopping System',
    actors: [
      { n: 'Customer', uc: ['Register / Login', 'Search Product', 'Manage Cart', 'Place Order', 'Track Shipment', 'Write Review'] },
      { n: 'Seller', uc: ['Add Product', 'Manage Inventory', 'Process Order'] },
      { n: 'Payment Gateway', uc: ['Make Payment'] },
      { n: 'Administrator', uc: ['Manage Users', 'Manage Categories'] }
    ],
    ctx: [
      { a: 'Customer', i: 'Product search & order', o: 'Product list, invoice, tracking' },
      { a: 'Seller', i: 'Product & stock data', o: 'Order notifications & sales report' },
      { a: 'Payment Gateway', i: 'Payment confirmation', o: 'Payment request' },
      { a: 'Administrator', i: 'User & category data', o: 'System reports' }
    ],
    proc: [['1.0', 'Manage Account'], ['2.0', 'Search & Browse'], ['3.0', 'Manage Cart'],
           ['4.0', 'Place Order'], ['5.0', 'Process Payment'], ['6.0', 'Ship Order']],
    store: [['D1', 'User DB'], ['D2', 'Product DB'], ['D3', 'Cart DB'], ['D4', 'Order DB']],
    flow: [['Customer', '1.0', 'Login details'], ['1.0', 'D1', 'User record'],
           ['Customer', '2.0', 'Search query'], ['D2', '2.0', 'Product info'],
           ['2.0', 'Customer', 'Product list'], ['Customer', '3.0', 'Add / remove item'],
           ['3.0', 'D3', 'Cart record'], ['3.0', 'Customer', 'Cart summary'],
           ['D3', '4.0', 'Cart contents'], ['4.0', 'D4', 'Order record'],
           ['4.0', '5.0', 'Order amount'], ['5.0', 'Payment Gateway', 'Payment request'],
           ['Payment Gateway', '5.0', 'Payment confirmation'], ['5.0', '6.0', 'Paid order'],
           ['6.0', 'D2', 'Stock update'], ['6.0', 'Customer', 'Tracking details'],
           ['Seller', '6.0', 'Dispatch details'], ['Administrator', '1.0', 'User management']],
    inc: [['Place Order', 'Make Payment']], ext: [['Apply Discount Coupon', 'Place Order']],
    cls: [
      { n: 'User', abs: 1, a: ['- userId : int', '- name : String', '- email : String'], m: ['+ login()'] },
      { n: 'Customer', a: ['- customerId : int', '- shippingAddress : String'], m: ['+ placeOrder()'] },
      { n: 'Seller', a: ['- sellerId : int', '- storeName : String', '- rating : double'], m: ['+ addProduct()'] },
      { n: 'Product', a: ['- productId : int', '- title : String', '- price : double', '- stock : int'], m: ['+ updateStock()'] },
      { n: 'Cart', a: ['- cartId : int', '- totalItems : int'], m: ['+ addItem()', '+ removeItem()'] },
      { n: 'Order', a: ['- orderId : int', '- orderDate : Date', '- status : String'], m: ['+ calculateTotal()'] },
      { n: 'Shipment', a: ['- trackingNo : String', '- courier : String', '- deliveredOn : Date'], m: ['+ track()'] }
    ],
    rel: [['inherit', 'Customer', 'User'], ['inherit', 'Seller', 'User'],
          ['assoc', 'Customer', 'Order', 'places', '1,*'],
          ['compose', 'Customer', 'Cart', 'owns', '1,1'],
          ['assoc', 'Cart', 'Product', 'holds', '*,*'],
          ['assoc', 'Seller', 'Product', 'sells', '1,*'],
          ['compose', 'Order', 'Shipment', 'ships via', '1,1']],
    seq: {
      t: 'Place Order',
      p: [['Customer', 1], [':ShopApp', 0], [':Cart', 0], [':Inventory', 0], [':PaymentGateway', 0]],
      m: [['c', 'Customer', ':ShopApp', 'checkout()'],
          ['c', ':ShopApp', ':Cart', 'getItems()'],
          ['r', ':Cart', ':ShopApp', 'cart items'],
          ['c', ':ShopApp', ':Inventory', 'reserveStock(items)'],
          ['r', ':Inventory', ':ShopApp', 'stock reserved'],
          ['c', ':ShopApp', ':PaymentGateway', 'pay(amount)'],
          ['r', ':PaymentGateway', ':ShopApp', 'paymentSuccess'],
          ['r', ':ShopApp', 'Customer', 'order confirmation']]
    },
    act: [['start'], ['action', 'Search for a product'], ['action', 'Add product to cart'],
          ['decision', 'Continue shopping?'], ['else', 'Browse more products'],
          ['action', 'Proceed to checkout'], ['action', 'Enter shipping address'],
          ['decision', 'Payment successful?'], ['else', 'Retry payment'],
          ['action', 'Confirm order'], ['action', 'Dispatch shipment'], ['end']],
    st: { s: ['Created', 'Paid', 'Packed', 'Shipped', 'Delivered', 'Returned'],
          init: 'Created', fin: 'Delivered',
          t: [['Created', 'Paid', 'paymentSuccess()'], ['Paid', 'Packed', 'packItems()'],
              ['Packed', 'Shipped', 'dispatch()'], ['Shipped', 'Delivered', 'confirmDelivery()'],
              ['Delivered', 'Returned', 'requestReturn()'], ['Created', 'Returned', 'cancelOrder()']] }
  },

  /* ====================== 7. STUDENT RESULT ====================== */
  {
    id: 'student', name: 'Student Result Management System', sys: 'Result System',
    actors: [
      { n: 'Student', uc: ['Register / Login', 'View Result', 'Download Marksheet', 'Apply for Review'] },
      { n: 'Teacher', uc: ['Enter Marks', 'Update Marks', 'View Class Report'] },
      { n: 'Administrator', uc: ['Manage Students', 'Manage Subjects', 'Publish Result'] }
    ],
    ctx: [
      { a: 'Student', i: 'Login & result request', o: 'Result & marksheet' },
      { a: 'Teacher', i: 'Subject marks', o: 'Class performance report' },
      { a: 'Administrator', i: 'Student & subject data', o: 'Published results' }
    ],
    proc: [['1.0', 'Manage Student Records'], ['2.0', 'Enter Marks'], ['3.0', 'Compute Result'],
           ['4.0', 'Publish Result'], ['5.0', 'Generate Marksheet']],
    store: [['D1', 'Student DB'], ['D2', 'Subject DB'], ['D3', 'Marks DB'], ['D4', 'Result DB']],
    flow: [['Administrator', '1.0', 'Student details'], ['1.0', 'D1', 'Student record'],
           ['Administrator', '1.0', 'Subject details'], ['1.0', 'D2', 'Subject record'],
           ['Teacher', '2.0', 'Subject marks'], ['D1', '2.0', 'Student list'],
           ['2.0', 'D3', 'Marks record'], ['D3', '3.0', 'Marks data'],
           ['D2', '3.0', 'Credit & weightage'], ['3.0', 'D4', 'Computed result'],
           ['Administrator', '4.0', 'Publish command'], ['D4', '4.0', 'Result data'],
           ['4.0', 'Student', 'Published result'], ['Student', '5.0', 'Marksheet request'],
           ['D4', '5.0', 'Result details'], ['5.0', 'Student', 'Marksheet PDF'],
           ['3.0', 'Teacher', 'Class report']],
    inc: [['View Result', 'Register / Login']], ext: [['Apply for Review', 'View Result']],
    cls: [
      { n: 'Person', abs: 1, a: ['- id : int', '- name : String', '- email : String'], m: ['+ login()'] },
      { n: 'Student', a: ['- rollNo : String', '- semester : int', '- department : String'], m: ['+ viewResult()'] },
      { n: 'Teacher', a: ['- teacherId : int', '- designation : String'], m: ['+ enterMarks()'] },
      { n: 'Subject', a: ['- subjectCode : String', '- subjectName : String', '- credit : int'], m: ['+ getDetails()'] },
      { n: 'Marks', a: ['- marksId : int', '- internal : int', '- external : int'], m: ['+ total()'] },
      { n: 'Result', a: ['- resultId : int', '- sgpa : double', '- status : String'], m: ['+ computeSGPA()'] },
      { n: 'Marksheet', a: ['- sheetNo : String', '- issuedOn : Date'], m: ['+ generatePDF()'] }
    ],
    rel: [['inherit', 'Student', 'Person'], ['inherit', 'Teacher', 'Person'],
          ['assoc', 'Student', 'Marks', 'scores', '1,*'],
          ['assoc', 'Subject', 'Marks', 'graded in', '1,*'],
          ['assoc', 'Teacher', 'Subject', 'teaches', '1,*'],
          ['compose', 'Student', 'Result', 'obtains', '1,1..*'],
          ['compose', 'Result', 'Marksheet', 'printed as', '1,1']],
    seq: {
      t: 'View Result',
      p: [['Student', 1], [':ResultPortal', 0], [':StudentRecord', 0], [':ResultEngine', 0]],
      m: [['c', 'Student', ':ResultPortal', 'login(rollNo, password)'],
          ['c', ':ResultPortal', ':StudentRecord', 'verify(rollNo)'],
          ['r', ':StudentRecord', ':ResultPortal', 'student valid'],
          ['c', 'Student', ':ResultPortal', 'viewResult(semester)'],
          ['c', ':ResultPortal', ':ResultEngine', 'fetchResult(rollNo, semester)'],
          ['r', ':ResultEngine', ':ResultPortal', 'marks + SGPA'],
          ['r', ':ResultPortal', 'Student', 'result displayed']]
    },
    act: [['start'], ['action', 'Teacher enters subject marks'], ['decision', 'All subjects entered?'],
          ['else', 'Enter remaining subjects'], ['action', 'Compute SGPA'],
          ['decision', 'Any backlog?'], ['else', 'Mark as supplementary'],
          ['action', 'Admin publishes result'], ['action', 'Student views marksheet'], ['end']],
    st: { s: ['Marks Pending', 'Marks Entered', 'Computed', 'Published', 'Under Review'],
          init: 'Marks Pending', fin: 'Published',
          t: [['Marks Pending', 'Marks Entered', 'enterMarks()'],
              ['Marks Entered', 'Computed', 'computeResult()'],
              ['Computed', 'Published', 'publish()'],
              ['Published', 'Under Review', 'applyForReview()'],
              ['Under Review', 'Published', 'reviewClosed()']] }
  },

  /* ====================== 8. HOTEL BOOKING ====================== */
  {
    id: 'hotel', name: 'Hotel Booking System', sys: 'Hotel System',
    actors: [
      { n: 'Guest', uc: ['Register / Login', 'Search Room', 'Book Room', 'Cancel Booking', 'Pay Bill'] },
      { n: 'Receptionist', uc: ['Check In Guest', 'Check Out Guest', 'Generate Invoice'] },
      { n: 'Manager', uc: ['Manage Rooms', 'View Occupancy Report'] },
      { n: 'Payment Gateway', uc: ['Make Payment'] }
    ],
    ctx: [
      { a: 'Guest', i: 'Booking & payment details', o: 'Confirmation, invoice' },
      { a: 'Receptionist', i: 'Check-in / check-out data', o: 'Room status & invoice' },
      { a: 'Manager', i: 'Room & tariff data', o: 'Occupancy reports' },
      { a: 'Payment Gateway', i: 'Payment confirmation', o: 'Payment request' }
    ],
    proc: [['1.0', 'Search Room'], ['2.0', 'Book Room'], ['3.0', 'Process Payment'],
           ['4.0', 'Check In / Check Out'], ['5.0', 'Manage Rooms']],
    store: [['D1', 'Guest DB'], ['D2', 'Room DB'], ['D3', 'Booking DB'], ['D4', 'Invoice DB']],
    flow: [['Guest', '1.0', 'Dates & room type'], ['D2', '1.0', 'Room availability'],
           ['1.0', 'Guest', 'Available rooms'], ['Guest', '2.0', 'Booking request'],
           ['2.0', 'D1', 'Guest record'], ['2.0', 'D3', 'Booking record'],
           ['2.0', 'D2', 'Room blocked'], ['2.0', '3.0', 'Tariff amount'],
           ['3.0', 'Payment Gateway', 'Payment request'], ['Payment Gateway', '3.0', 'Payment confirmation'],
           ['3.0', 'Guest', 'Booking confirmation'], ['Receptionist', '4.0', 'Check-in / out details'],
           ['D3', '4.0', 'Booking details'], ['4.0', 'D4', 'Invoice record'],
           ['4.0', 'Guest', 'Invoice'], ['Manager', '5.0', 'Room & tariff data'],
           ['5.0', 'D2', 'Room update']],
    inc: [['Book Room', 'Make Payment']], ext: [['Request Extra Service', 'Book Room']],
    cls: [
      { n: 'Guest', a: ['- guestId : int', '- name : String', '- phone : String', '- idProof : String'], m: ['+ bookRoom()'] },
      { n: 'Room', a: ['- roomNo : String', '- roomType : String', '- tariff : double', '- status : String'], m: ['+ setStatus()'] },
      { n: 'Booking', a: ['- bookingId : int', '- checkIn : Date', '- checkOut : Date', '- status : String'], m: ['+ confirm()', '+ cancel()'] },
      { n: 'Payment', a: ['- paymentId : int', '- amount : double', '- mode : String'], m: ['+ processPayment()'] },
      { n: 'Invoice', a: ['- invoiceNo : String', '- totalAmount : double', '- taxes : double'], m: ['+ generate()'] },
      { n: 'Service', a: ['- serviceId : int', '- serviceName : String', '- charge : double'], m: ['+ addToBill()'] }
    ],
    rel: [['assoc', 'Guest', 'Booking', 'makes', '1,*'],
          ['assoc', 'Booking', 'Room', 'reserves', '*,1'],
          ['assoc', 'Booking', 'Payment', 'paid by', '1,1'],
          ['compose', 'Booking', 'Invoice', 'billed as', '1,1'],
          ['aggregate', 'Invoice', 'Service', 'includes', '1,*']],
    seq: {
      t: 'Book Room',
      p: [['Guest', 1], [':HotelSystem', 0], [':RoomManager', 0], [':PaymentGateway', 0]],
      m: [['c', 'Guest', ':HotelSystem', 'searchRoom(dates, type)'],
          ['c', ':HotelSystem', ':RoomManager', 'findAvailable(dates, type)'],
          ['r', ':RoomManager', ':HotelSystem', 'available rooms'],
          ['c', 'Guest', ':HotelSystem', 'bookRoom(roomNo)'],
          ['c', ':HotelSystem', ':PaymentGateway', 'collectAdvance(amount)'],
          ['r', ':PaymentGateway', ':HotelSystem', 'paymentSuccess'],
          ['c', ':HotelSystem', ':RoomManager', 'blockRoom(roomNo)'],
          ['r', ':HotelSystem', 'Guest', 'booking confirmation']]
    },
    act: [['start'], ['action', 'Enter stay dates'], ['action', 'Search available rooms'],
          ['decision', 'Room available?'], ['else', 'Change dates or room type'],
          ['action', 'Enter guest details'], ['action', 'Pay advance'],
          ['decision', 'Payment successful?'], ['else', 'Release blocked room'],
          ['action', 'Confirm booking'], ['action', 'Check in on arrival'], ['end']],
    st: { s: ['Vacant', 'Reserved', 'Occupied', 'Cleaning', 'Out of Service'],
          init: 'Vacant', fin: 'Vacant',
          t: [['Vacant', 'Reserved', 'bookRoom()'], ['Reserved', 'Occupied', 'checkIn()'],
              ['Reserved', 'Vacant', 'cancelBooking()'], ['Occupied', 'Cleaning', 'checkOut()'],
              ['Cleaning', 'Vacant', 'cleaned()'], ['Vacant', 'Out of Service', 'maintenance()']] }
  },

  /* ====================== 9. ONLINE BANKING ====================== */
  {
    id: 'banking', name: 'Online Banking System', sys: 'Banking System',
    actors: [
      { n: 'Customer', uc: ['Register / Login', 'Check Balance', 'Transfer Funds', 'Pay Bill', 'Download Statement'] },
      { n: 'Bank Officer', uc: ['Open Account', 'Approve Loan', 'Block Account'] },
      { n: 'Administrator', uc: ['Manage Users', 'Monitor Transactions'] }
    ],
    ctx: [
      { a: 'Customer', i: 'Login & transaction request', o: 'Balance, statement, confirmation' },
      { a: 'Bank Officer', i: 'Account & loan decisions', o: 'Account details & alerts' },
      { a: 'Administrator', i: 'User management data', o: 'Audit reports' }
    ],
    proc: [['1.0', 'Authenticate User'], ['2.0', 'Manage Account'], ['3.0', 'Transfer Funds'],
           ['4.0', 'Pay Bill'], ['5.0', 'Generate Statement']],
    store: [['D1', 'Customer DB'], ['D2', 'Account DB'], ['D3', 'Transaction DB'], ['D4', 'Beneficiary DB']],
    flow: [['Customer', '1.0', 'Credentials'], ['D1', '1.0', 'Customer record'],
           ['1.0', 'Customer', 'Session token'], ['Customer', '2.0', 'Balance enquiry'],
           ['D2', '2.0', 'Account details'], ['2.0', 'Customer', 'Balance'],
           ['Customer', '3.0', 'Transfer request'], ['D4', '3.0', 'Beneficiary details'],
           ['D2', '3.0', 'Available balance'], ['3.0', 'D2', 'Debit / credit update'],
           ['3.0', 'D3', 'Transaction record'], ['3.0', 'Customer', 'Transfer confirmation'],
           ['Customer', '4.0', 'Bill payment request'], ['4.0', 'D3', 'Payment record'],
           ['Customer', '5.0', 'Statement request'], ['D3', '5.0', 'Transaction history'],
           ['5.0', 'Customer', 'Statement PDF'], ['Bank Officer', '2.0', 'Open / block account']],
    inc: [['Transfer Funds', 'Register / Login']], ext: [['Add Beneficiary', 'Transfer Funds']],
    cls: [
      { n: 'Customer', a: ['- customerId : int', '- name : String', '- mobile : String'], m: ['+ login()'] },
      { n: 'Account', a: ['- accountNo : String', '- accountType : String', '- balance : double'], m: ['+ debit()', '+ credit()'] },
      { n: 'Transaction', a: ['- txnId : String', '- txnType : String', '- amount : double', '- txnDate : Date'], m: ['+ execute()'] },
      { n: 'Beneficiary', a: ['- beneficiaryId : int', '- name : String', '- accountNo : String'], m: ['+ validate()'] },
      { n: 'Statement', a: ['- fromDate : Date', '- toDate : Date'], m: ['+ generatePDF()'] },
      { n: 'Loan', a: ['- loanId : int', '- principal : double', '- rate : double', '- tenure : int'], m: ['+ computeEMI()'] }
    ],
    rel: [['compose', 'Customer', 'Account', 'holds', '1,1..*'],
          ['assoc', 'Account', 'Transaction', 'records', '1,*'],
          ['assoc', 'Customer', 'Beneficiary', 'adds', '1,*'],
          ['assoc', 'Account', 'Statement', 'summarised in', '1,*'],
          ['assoc', 'Customer', 'Loan', 'avails', '1,*']],
    seq: {
      t: 'Transfer Funds',
      p: [['Customer', 1], [':NetBanking', 0], [':AuthService', 0], [':AccountService', 0]],
      m: [['c', 'Customer', ':NetBanking', 'login(userId, password)'],
          ['c', ':NetBanking', ':AuthService', 'authenticate(userId)'],
          ['r', ':AuthService', ':NetBanking', 'session token'],
          ['c', 'Customer', ':NetBanking', 'transfer(toAcc, amount)'],
          ['c', ':NetBanking', ':AccountService', 'checkBalance(fromAcc)'],
          ['r', ':AccountService', ':NetBanking', 'sufficient balance'],
          ['c', ':NetBanking', ':AccountService', 'debitAndCredit(amount)'],
          ['r', ':AccountService', ':NetBanking', 'txnId'],
          ['r', ':NetBanking', 'Customer', 'transfer successful']]
    },
    act: [['start'], ['action', 'Login with credentials'], ['decision', 'Credentials valid?'],
          ['else', 'Show login error'], ['action', 'Select transfer'],
          ['action', 'Choose beneficiary & amount'], ['decision', 'Sufficient balance?'],
          ['else', 'Show insufficient funds'], ['action', 'Verify OTP'],
          ['action', 'Debit & credit accounts'], ['action', 'Send confirmation'], ['end']],
    st: { s: ['Initiated', 'Pending OTP', 'Processing', 'Completed', 'Failed'],
          init: 'Initiated', fin: 'Completed',
          t: [['Initiated', 'Pending OTP', 'requestOTP()'], ['Pending OTP', 'Processing', 'otpVerified()'],
              ['Pending OTP', 'Failed', 'otpExpired()'], ['Processing', 'Completed', 'amountTransferred()'],
              ['Processing', 'Failed', 'transferDeclined()']] }
  },

  /* ====================== 10. PAYROLL ====================== */
  {
    id: 'payroll', name: 'Payroll Management System', sys: 'Payroll System',
    actors: [
      { n: 'Employee', uc: ['Login', 'Mark Attendance', 'Apply Leave', 'View Payslip'] },
      { n: 'HR Manager', uc: ['Manage Employees', 'Approve Leave', 'Process Payroll'] },
      { n: 'Accountant', uc: ['Verify Salary', 'Disburse Salary', 'Generate Tax Report'] }
    ],
    ctx: [
      { a: 'Employee', i: 'Attendance & leave request', o: 'Payslip & leave status' },
      { a: 'HR Manager', i: 'Employee & salary structure', o: 'Payroll summary' },
      { a: 'Accountant', i: 'Disbursement approval', o: 'Salary register & tax report' }
    ],
    proc: [['1.0', 'Manage Employee'], ['2.0', 'Record Attendance'], ['3.0', 'Process Leave'],
           ['4.0', 'Compute Salary'], ['5.0', 'Disburse Salary']],
    store: [['D1', 'Employee DB'], ['D2', 'Attendance DB'], ['D3', 'Leave DB'], ['D4', 'Payroll DB']],
    flow: [['HR Manager', '1.0', 'Employee details'], ['1.0', 'D1', 'Employee record'],
           ['Employee', '2.0', 'Daily attendance'], ['2.0', 'D2', 'Attendance record'],
           ['Employee', '3.0', 'Leave request'], ['HR Manager', '3.0', 'Approval'],
           ['3.0', 'D3', 'Leave record'], ['3.0', 'Employee', 'Leave status'],
           ['D1', '4.0', 'Salary structure'], ['D2', '4.0', 'Working days'],
           ['D3', '4.0', 'Leave deduction'], ['4.0', 'D4', 'Payroll record'],
           ['4.0', 'HR Manager', 'Payroll summary'], ['Accountant', '5.0', 'Disbursement approval'],
           ['D4', '5.0', 'Net salary'], ['5.0', 'Employee', 'Payslip'],
           ['5.0', 'Accountant', 'Salary register']],
    inc: [['Process Payroll', 'Mark Attendance']], ext: [['Apply Leave', 'Mark Attendance']],
    cls: [
      { n: 'Employee', a: ['- empId : int', '- name : String', '- designation : String', '- doj : Date'], m: ['+ applyLeave()'] },
      { n: 'Department', a: ['- deptId : int', '- deptName : String'], m: ['+ getEmployees()'] },
      { n: 'Attendance', a: ['- attId : int', '- date : Date', '- status : String'], m: ['+ mark()'] },
      { n: 'Leave', a: ['- leaveId : int', '- leaveType : String', '- days : int', '- status : String'], m: ['+ approve()'] },
      { n: 'SalaryStructure', a: ['- basic : double', '- hra : double', '- allowance : double'], m: ['+ gross()'] },
      { n: 'Payslip', a: ['- payslipId : int', '- month : String', '- netPay : double', '- deductions : double'], m: ['+ generate()'] }
    ],
    rel: [['assoc', 'Department', 'Employee', 'employs', '1,*'],
          ['assoc', 'Employee', 'Attendance', 'marks', '1,*'],
          ['assoc', 'Employee', 'Leave', 'applies for', '1,*'],
          ['compose', 'Employee', 'SalaryStructure', 'has', '1,1'],
          ['compose', 'Employee', 'Payslip', 'receives', '1,*']],
    seq: {
      t: 'Process Payroll',
      p: [['HR Manager', 1], [':PayrollSystem', 0], [':AttendanceService', 0], [':SalaryEngine', 0]],
      m: [['c', 'HR Manager', ':PayrollSystem', 'processPayroll(month)'],
          ['c', ':PayrollSystem', ':AttendanceService', 'getWorkingDays(month)'],
          ['r', ':AttendanceService', ':PayrollSystem', 'attendance summary'],
          ['c', ':PayrollSystem', ':SalaryEngine', 'computeSalary(empId, days)'],
          ['r', ':SalaryEngine', ':PayrollSystem', 'gross, deductions, net'],
          ['c', ':PayrollSystem', ':SalaryEngine', 'generatePayslip()'],
          ['r', ':PayrollSystem', 'HR Manager', 'payroll summary']]
    },
    act: [['start'], ['action', 'Collect monthly attendance'], ['action', 'Apply approved leaves'],
          ['decision', 'Attendance complete?'], ['else', 'Request missing entries'],
          ['action', 'Compute gross salary'], ['action', 'Apply deductions & tax'],
          ['decision', 'Accountant approves?'], ['else', 'Send back for correction'],
          ['action', 'Disburse salary'], ['action', 'Issue payslips'], ['end']],
    st: { s: ['Draft', 'Computed', 'Pending Approval', 'Approved', 'Disbursed'],
          init: 'Draft', fin: 'Disbursed',
          t: [['Draft', 'Computed', 'computeSalary()'], ['Computed', 'Pending Approval', 'submit()'],
              ['Pending Approval', 'Approved', 'approve()'], ['Pending Approval', 'Draft', 'reject()'],
              ['Approved', 'Disbursed', 'transferSalary()']] }
  }
  ];

  /* ------------------------------------------------- spec text emitters */
  function uniq(a) { var s = {}, o = []; a.forEach(function (x) { if (!s[x]) { s[x] = 1; o.push(x); } }); return o; }

  function dfd0(d) {
    var L = ['title DFD Level 0 - Context Diagram : ' + d.name, ''];
    d.ctx.forEach(function (c) { L.push('entity ' + c.a); });
    L.push('', 'process 0 ' + d.sys, '');
    d.ctx.forEach(function (c) {
      L.push('flow ' + c.a + ' -> 0 : ' + c.i);
      L.push('flow 0 -> ' + c.a + ' : ' + c.o);
    });
    return L.join('\n');
  }

  function dfd1(d) {
    var L = ['title DFD Level 1 : ' + d.name, ''];
    d.ctx.forEach(function (c) { L.push('entity ' + c.a); });
    L.push('');
    d.proc.forEach(function (p) { L.push('process ' + p[0] + ' ' + p[1]); });
    L.push('');
    d.store.forEach(function (s) { L.push('store ' + s[0] + ' ' + s[1]); });
    L.push('');
    d.flow.forEach(function (f) { L.push('flow ' + f[0] + ' -> ' + f[1] + ' : ' + f[2]); });
    return L.join('\n');
  }

  function usecase(d) {
    var L = ['title Use Case Diagram : ' + d.name, 'system ' + d.name, ''];
    d.actors.forEach(function (a) { L.push('actor ' + a.n); });
    L.push('');
    var all = [];
    d.actors.forEach(function (a) { a.uc.forEach(function (u) { all.push(u); }); });
    (d.inc || []).forEach(function (x) { all.push(x[1]); });
    (d.ext || []).forEach(function (x) { all.push(x[0]); });
    uniq(all).forEach(function (u) { L.push('usecase ' + u); });
    L.push('');
    d.actors.forEach(function (a) {
      a.uc.forEach(function (u) { L.push('link ' + a.n + ' - ' + u); });
    });
    L.push('');
    (d.inc || []).forEach(function (x) { L.push('include ' + x[0] + ' -> ' + x[1]); });
    (d.ext || []).forEach(function (x) { L.push('extend ' + x[0] + ' -> ' + x[1]); });
    return L.join('\n');
  }

  function cls(d) {
    var L = ['title Class Diagram : ' + d.name, ''];
    d.cls.forEach(function (c) {
      L.push((c.abs ? 'abstract class ' : 'class ') + c.n + ' {');
      c.a.forEach(function (x) { L.push(x); });
      c.m.forEach(function (x) { L.push(x); });
      L.push('}', '');
    });
    d.rel.forEach(function (r) {
      var s = r[0] + ' ' + r[1] + ' -> ' + r[2];
      if (r[3]) s += ' : ' + r[3];
      if (r[4]) s += ' [' + r[4] + ']';
      L.push(s);
    });
    return L.join('\n');
  }

  function seq(d) {
    var L = ['title Sequence Diagram : ' + d.seq.t + ' - ' + d.name, ''];
    d.seq.p.forEach(function (p) { L.push((p[1] ? 'actor ' : 'participant ') + p[0]); });
    L.push('');
    d.seq.m.forEach(function (m) {
      L.push((m[0] === 'c' ? 'call ' : 'return ') + m[1] + ' -> ' + m[2] + ' : ' + m[3]);
    });
    return L.join('\n');
  }

  function activity(d) {
    var L = ['title Activity Diagram : ' + d.name, ''];
    d.act.forEach(function (a) {
      L.push(a.length > 1 ? a[0] + ' ' + a[1] : a[0]);
    });
    return L.join('\n');
  }

  function state(d) {
    var L = ['title State Chart Diagram : ' + d.name, ''];
    d.st.s.forEach(function (s) { L.push('state ' + s); });
    L.push('', 'initial ' + d.st.init, 'final ' + d.st.fin, '');
    d.st.t.forEach(function (t) { L.push('trans ' + t[0] + ' -> ' + t[1] + ' : ' + t[2]); });
    return L.join('\n');
  }

  function er(d) {
    var L = ['title ER Diagram : ' + d.name, ''];
    var ents = d.cls.filter(function (c) { return !c.abs; }).slice(0, 5);
    var names = {};
    ents.forEach(function (c) {
      names[c.n] = 1;
      L.push('erentity ' + c.n);
      c.a.slice(0, 4).forEach(function (a, i) {
        var bare = a.replace(/^[-+#]\s*/, '').split(' : ')[0].trim();
        L.push((i === 0 ? 'erkey ' : 'erattr ') + c.n + ' : ' + bare);
      });
      L.push('');
    });
    d.rel.forEach(function (r) {
      if (r[0] === 'inherit') return;
      if (!names[r[1]] || !names[r[2]]) return;
      var card = (r[4] || '1,*').split(',');
      var c1 = card[0].indexOf('*') >= 0 ? 'M' : '1';
      var c2 = (card[1] || '*').indexOf('*') >= 0 ? 'N' : '1';
      L.push('errel ' + r[1] + ' - ' + r[2] + ' : ' + (r[3] || 'relates') + ' [' + c1 + ',' + c2 + ']');
    });
    return L.join('\n');
  }

  function component(d) {
    var L = ['title Component Diagram : ' + d.name, ''];
    var ui = d.sys.replace(/ System$/, '') + ' Web / Mobile UI';
    L.push('component ' + ui);
    var svcs = d.proc.slice(0, 4).map(function (p) { return p[1] + ' Service'; });
    svcs.forEach(function (s) { L.push('component ' + s); });
    L.push('');
    d.store.slice(0, 2).forEach(function (s) { L.push('database ' + s[1]); });
    L.push('');
    svcs.forEach(function (s) { L.push('depend ' + ui + ' -> ' + s + ' : uses'); });
    var dbs = d.store.slice(0, 2).map(function (x) { return x[1]; });
    svcs.forEach(function (s, k) {
      L.push('depend ' + s + ' -> ' + dbs[k % dbs.length] + ' : reads/writes');
    });
    return L.join('\n');
  }

  function deployment(d) {
    var app = d.sys.replace(/ System$/, '') + ' Application';
    return ['title Deployment Diagram : ' + d.name, '',
      'node Client Device', 'artifact Client Device : Web Browser / Mobile App', '',
      'node Application Server', 'artifact Application Server : ' + app,
      'artifact Application Server : Business Logic', '',
      'node Database Server', 'artifact Database Server : ' + d.store[0][1], '',
      'conn Client Device -> Application Server : HTTPS / REST',
      'conn Application Server -> Database Server : JDBC / SQL'].join('\n');
  }

  var EMIT = {
    dfd0: dfd0, dfd: dfd1, usecase: usecase, 'class': cls, sequence: seq,
    activity: activity, state: state, er: er, component: component, deployment: deployment
  };

  return {
    list: S,
    /* the spec text for a given diagram type + subject id */
    spec: function (type, id) {
      var d = null;
      S.forEach(function (x) { if (x.id === id) d = x; });
      if (!d) d = S[0];
      var fn = EMIT[type] || EMIT.dfd;
      return fn(d);
    }
  };
})();
