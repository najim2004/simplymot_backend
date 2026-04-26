# Missing Old APIs In New Project

Strict old route vs new route comparison:

1. Old project APIs found: `212`
2. New project APIs found: `104`
3. Old APIs not found by exact route match in new project: `173`

Note: Some features may already exist in `new` under renamed routes, but the APIs below are missing by exact old route match.

## 1. Admin Dashboard

1. `GET admin/dashboard`
2. `GET admin/dashboard/analytics`

## 2. Admin Driver

1. `GET admin/driver`
2. `GET admin/driver/:id`
3. `PATCH admin/driver/:id/approve`
4. `PATCH admin/driver/:id/reject`
5. `DELETE admin/driver/:id/delete`

## 3. Admin FAQ

1. `POST admin/faq`
2. `POST admin/faq/batch-create`
3. `GET admin/faq`
4. `GET admin/faq/:id`
5. `PATCH admin/faq/:id`
6. `DELETE admin/faq/:id`

## 4. Admin Garage

1. `PATCH admin/garage/:id/approve`
2. `PATCH admin/garage/:id/reject`
3. `DELETE admin/garage/:id`

## 5. Admin Notification

1. `POST admin/notifications/bulk`
2. `GET admin/notifications`
3. `GET admin/notifications/unread/count`
4. `PATCH admin/notifications/read-all`
5. `PATCH admin/notifications/:id/read`
6. `DELETE admin/notifications/all`
7. `DELETE admin/notifications/:id`

## 6. Admin Payment Transaction

1. `GET admin/payment-transaction`
2. `GET admin/payment-transaction/:id`
3. `DELETE admin/payment-transaction/:id`

## 7. Admin Booking Actions

1. `PATCH admin/booking/:id/status`
2. `PATCH admin/booking/:id/cancel`

## 8. Admin Vehicle

1. `GET admin/vehicle/reminder-settings`
2. `PATCH admin/vehicle/reminder-settings`
3. `POST admin/vehicle/send-reminder`
4. `DELETE admin/vehicle/:id`

## 9. Admin Website Info

1. `POST admin/website-info`
2. `GET admin/website-info`

## 10. Admin User Roles

1. `GET admin/user/:id/roles`
2. `POST admin/user/:id/roles`
3. `DELETE admin/user/:id/roles/:roleId`

## 11. Admin Subscription Plans / Migration

1. `GET admin/subscription/plans`
2. `GET admin/subscription/plans/active`
3. `GET admin/subscription/plans/:id`
4. `POST admin/subscription/plans`
5. `PUT admin/subscription/plans/:id`
6. `DELETE admin/subscription/plans/:id`
7. `POST admin/subscription/plans/:id/stripe/sync`
8. `POST admin/subscription/plans/:id/migration/price`
9. `POST admin/subscription/plans/:id/migration/notices`
10. `POST admin/subscription/plans/:id/migration/bulk`
11. `GET admin/subscription/plans/:id/migration/status`
12. `GET admin/subscription/plans/migration/summary`
13. `POST admin/subscription/plans/trigger-price-migration`
14. `GET admin/subscription/plans/:id/migration/jobs`
15. `GET admin/subscription/plans/:id/migration/statistics`

## 12. Admin Subscription Garages / Analytics

1. `GET admin/subscription/garages`
2. `GET admin/subscription/garages/:id`
3. `PUT admin/subscription/garages/:id`
4. `GET admin/subscription/garages/analytics`
5. `GET admin/subscription/garages/health`
6. `GET admin/subscription/garages/garage/:garageId/history`
7. `GET admin/subscription/garages/analytics/status-breakdown`
8. `GET admin/subscription/garages/analytics/recent-activity`
9. `GET admin/subscription/garages/analytics/revenue-trend`

## 13. Admin Subscription Migration Jobs

1. `GET admin/subscription/migration/jobs`
2. `GET admin/subscription/migration/jobs/active`
3. `GET admin/subscription/migration/jobs/statistics`
4. `GET admin/subscription/migration/jobs/:jobId`
5. `GET admin/subscription/migration/jobs/plan/:planId`
6. `POST admin/subscription/migration/jobs`
7. `POST admin/subscription/migration/jobs/:jobId/retry`
8. `PUT admin/subscription/migration/jobs/:jobId/cancel`

## 14. Promo Code Old Route

1. `POST admin/subscription/promo-codes`
2. `GET admin/subscription/promo-codes`
3. `PATCH admin/subscription/promo-codes/:id/deactivate`

## 15. Auth

1. `GET auth/google`
2. `GET auth/google/redirect`
3. `POST auth/generate-2fa-secret`
4. `POST auth/verify-2fa`
5. `POST auth/enable-2fa`
6. `POST auth/disable-2fa`

## 16. Chat

1. `GET chat/user`
2. `POST chat/conversation`
3. `GET chat/conversation`
4. `GET chat/conversation/:id`
5. `DELETE chat/conversation/:id`
6. `POST chat/message`
7. `GET chat/message`

## 17. Public FAQ

1. `GET faq`
2. `GET faq/:id`

## 18. Contact

1. `POST contact/with-auth`

## 19. Notification App

1. `GET notification/unread-count`
2. `PATCH notification/read-all`
3. `PATCH notification/:id/read`
4. `DELETE notification/all`
5. `DELETE notification/:id`

## 20. Garage Dashboard

1. `GET garage-dashboard/profile`
2. `PATCH garage-dashboard/profile`
3. `GET garage-dashboard/services`
4. `DELETE garage-dashboard/services/:id`
5. `POST garage-dashboard/service-price`
6. `GET garage-dashboard/schedule`
7. `POST garage-dashboard/schedule`
8. `POST garage-dashboard/schedule/holiday`
9. `DELETE garage-dashboard/schedule/holiday`
10. `GET garage-dashboard/schedule/holidays`
11. `PATCH garage-dashboard/reschedule`
12. `POST garage-dashboard/schedule/weekly`
13. `GET garage-dashboard/schedule/slots/view`
14. `POST garage-dashboard/schedule/slots`
15. `GET garage-dashboard/schedule/slots`
16. `PATCH garage-dashboard/schedule/slots/:id/block`
17. `PATCH garage-dashboard/schedule/slots/:id/unblock`
18. `POST garage-dashboard/schedule/slots/manual`
19. `DELETE garage-dashboard/schedule/slots/manual`
20. `DELETE garage-dashboard/schedule/slots/:id`
21. `GET garage-dashboard/schedule/calendar`
22. `GET garage-dashboard/schedule/calendar-view`
23. `POST garage-dashboard/schedule/modify`
24. `PATCH garage-dashboard/schedule/slots/time`
25. `GET garage-dashboard/bookings`
26. `GET garage-dashboard/bookings/:id`
27. `PATCH garage-dashboard/bookings/:id/status`
28. `PATCH garage-dashboard/bookings/:id/cancel`
29. `GET garage-dashboard/payments`
30. `GET garage-dashboard/payments/:id`
31. `GET garage-dashboard/invoices`
32. `GET garage-dashboard/invoices/:id`
33. `POST garage-dashboard/invoices/:id/download`
34. `GET garage-dashboard/subscription/plans`
35. `GET garage-dashboard/subscription/me`
36. `POST garage-dashboard/subscription/checkout`
37. `POST garage-dashboard/subscription/billing-portal`
38. `POST garage-dashboard/subscription/cancel`
39. `GET garage-dashboard/subscription/success`

## 21. Vehicle / Driver Journey

1. `POST vehicles`
2. `GET vehicles`
3. `GET vehicles/:id`
4. `PATCH vehicles/:id`
5. `DELETE vehicles/:id`
6. `GET vehicles/mot-report/:reportId`
7. `GET vehicles/:vehicleId/mot-reports`
8. `PATCH vehicles/:vehicleId/mot-reports/refresh`
9. `GET vehicles/my-bookings`
10. `PATCH vehicles/my-bookings/:id/cancel`
11. `PATCH vehicles/my-bookings/:id/reschedule`
12. `GET vehicles/search-garages`
13. `POST vehicles/search-garages`
14. `GET vehicles/garages/:garageId/services`
15. `GET vehicles/garages/:garageId/slots`
16. `POST vehicles/book-slot`
