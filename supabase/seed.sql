-- seed.sql
-- Seed data for one demo tenant: Test Fitness (Pala, Kerala)
-- Includes bootstrap inserts for required auth.users rows.

-- Fixed IDs for deterministic seeding.
-- Gym / users
-- gym_id:           11111111-1111-1111-1111-111111111111
-- owner_user_id:    22222222-2222-2222-2222-222222222222
-- reception_user_id:33333333-3333-3333-3333-333333333333
-- owner_staff_id:   44444444-4444-4444-4444-444444444444
-- recep_staff_id:   55555555-5555-5555-5555-555555555555

-- Bootstrap auth users for FK references (owner + receptionist).
-- Password hash is a placeholder and not meant for real login.
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
(
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'owner@testfitness.local',
  '$2a$10$7EqJtq98hPqEX7fNZaFWoOaZpWwQ5Q0MyoVo9hw3rroWAt4EvsC0u',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Owner - Test Fitness"}'::jsonb,
  now(),
  now()
),
(
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'reception@testfitness.local',
  '$2a$10$7EqJtq98hPqEX7fNZaFWoOaZpWwQ5Q0MyoVo9hw3rroWAt4EvsC0u',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Reception - Test Fitness"}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.gyms (
  id, owner_id, name, slug, phone, city, state,
  razorpay_key_id, razorpay_secret, waba_phone, waba_token,
  plan_tier, is_active, onboarded_at, created_at
) values (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Test Fitness',
  'test-fitness',
  '+919900000001',
  'Pala',
  'Kerala',
  'rzp_test_key_testfitness',
  'rzp_test_secret_testfitness',
  '+919900000099',
  'waba_token_testfitness',
  'growth',
  true,
  now(),
  now()
);

insert into public.gym_settings (
  gym_id, pricing_json, batch_timings, ladies_batch, personal_training,
  ai_instructions, auto_reminders, reminder_days, supplement_enabled,
  updated_at, created_at
) values (
  '11111111-1111-1111-1111-111111111111',
  '{"gold_6m": 8000, "silver_3m": 4500, "bronze_1m": 1500}'::jsonb,
  'Morning 5AM-9AM, Evening 5PM-10PM',
  true,
  true,
  'You are the assistant for Test Fitness. Be concise and friendly.',
  true,
  7,
  false,
  now(),
  now()
);

insert into public.gym_staff (id, gym_id, user_id, role, name, created_at) values
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'owner', 'Owner - Test Fitness', now()),
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'receptionist', 'Reception - Test Fitness', now());

-- 20 members (active / expiring / churned mix)
insert into public.members (
  id, gym_id, name, phone, email, plan_type, status, expiry_date,
  joined_at, streak_count, notes, added_by, created_at
) values
('aaaaaaa1-1111-4111-8111-111111111111', '11111111-1111-1111-1111-111111111111', 'Arun Mathew', '+919900000101', 'arun@example.com', 'gold_6m', 'active', now() + interval '60 days', now() - interval '120 days', 18, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaaa2-2222-4222-8222-222222222222', '11111111-1111-1111-1111-111111111111', 'Nikhil Jose', '+919900000102', 'nikhil@example.com', 'silver_3m', 'active', now() + interval '35 days', now() - interval '90 days', 10, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaaa3-3333-4333-8333-333333333333', '11111111-1111-1111-1111-111111111111', 'Riya Thomas', '+919900000103', 'riya@example.com', 'bronze_1m', 'expiring', now() + interval '5 days', now() - interval '25 days', 7, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaaa4-4444-4444-8444-444444444444', '11111111-1111-1111-1111-111111111111', 'Sneha George', '+919900000104', 'sneha@example.com', 'silver_3m', 'churned', now() - interval '15 days', now() - interval '120 days', 2, 'May return next month', '55555555-5555-5555-5555-555555555555', now()),
('aaaaaaa5-5555-4555-8555-555555555555', '11111111-1111-1111-1111-111111111111', 'Fahad Ali', '+919900000105', 'fahad@example.com', 'gold_6m', 'active', now() + interval '100 days', now() - interval '80 days', 21, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaaa6-6666-4666-8666-666666666666', '11111111-1111-1111-1111-111111111111', 'Liya Paul', '+919900000106', 'liya@example.com', 'bronze_1m', 'expiring', now() + interval '2 days', now() - interval '28 days', 14, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaaa7-7777-4777-8777-777777777777', '11111111-1111-1111-1111-111111111111', 'Akhil Raj', '+919900000107', 'akhil@example.com', 'silver_3m', 'active', now() + interval '45 days', now() - interval '60 days', 9, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaaa8-8888-4888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'Meera Nair', '+919900000108', 'meera@example.com', 'gold_6m', 'active', now() + interval '150 days', now() - interval '30 days', 26, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaaa9-9999-4999-8999-999999999999', '11111111-1111-1111-1111-111111111111', 'Jibin James', '+919900000109', 'jibin@example.com', 'bronze_1m', 'churned', now() - interval '30 days', now() - interval '75 days', 0, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaaab-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Anjali Varghese', '+919900000110', 'anjali@example.com', 'silver_3m', 'active', now() + interval '20 days', now() - interval '40 days', 12, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaaac-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Joel Kurian', '+919900000111', 'joel@example.com', 'gold_6m', 'active', now() + interval '75 days', now() - interval '150 days', 33, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaaad-dddd-4ddd-8ddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Asha Babu', '+919900000112', 'asha@example.com', 'bronze_1m', 'expiring', now() + interval '6 days', now() - interval '26 days', 5, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaaae-eeee-4eee-8eee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'Rahul Menon', '+919900000113', 'rahul@example.com', 'silver_3m', 'active', now() + interval '28 days', now() - interval '55 days', 11, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaaaf-ffff-4fff-8fff-ffffffffffff', '11111111-1111-1111-1111-111111111111', 'Diya Sebastian', '+919900000114', 'diya@example.com', 'gold_6m', 'active', now() + interval '90 days', now() - interval '70 days', 20, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaab0-0000-4000-8000-000000000000', '11111111-1111-1111-1111-111111111111', 'Sanjay Das', '+919900000115', 'sanjay@example.com', 'bronze_1m', 'churned', now() - interval '5 days', now() - interval '40 days', 1, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaab1-1111-4111-8111-111111111110', '11111111-1111-1111-1111-111111111111', 'Gokul Krishna', '+919900000116', 'gokul@example.com', 'silver_3m', 'expiring', now() + interval '1 day', now() - interval '29 days', 8, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaab2-2222-4222-8222-222222222220', '11111111-1111-1111-1111-111111111111', 'Femi Joseph', '+919900000117', 'femi@example.com', 'gold_6m', 'active', now() + interval '120 days', now() - interval '20 days', 27, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaab3-3333-4333-8333-333333333330', '11111111-1111-1111-1111-111111111111', 'Nisha Roy', '+919900000118', 'nisha@example.com', 'bronze_1m', 'active', now() + interval '15 days', now() - interval '10 days', 6, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaab4-4444-4444-8444-444444444440', '11111111-1111-1111-1111-111111111111', 'Pranav Pillai', '+919900000119', 'pranav@example.com', 'silver_3m', 'churned', now() - interval '45 days', now() - interval '180 days', 0, null, '55555555-5555-5555-5555-555555555555', now()),
('aaaaaab5-5555-4555-8555-555555555550', '11111111-1111-1111-1111-111111111111', 'Keerthi Anand', '+919900000120', 'keerthi@example.com', 'gold_6m', 'active', now() + interval '55 days', now() - interval '95 days', 16, null, '55555555-5555-5555-5555-555555555555', now());

-- 5 leads in different stages
insert into public.leads (
  id, gym_id, name, phone, source, query_text, stage, ai_reply_sent,
  discount_sent, converted_member, last_interaction, created_at
) values
('bbbbbbb1-1111-4111-8111-111111111111', '11111111-1111-1111-1111-111111111111', 'Kiran', '+919900000201', 'instagram_ad', 'What are your monthly packages?', 'new', false, false, null, now() - interval '1 hour', now()),
('bbbbbbb2-2222-4222-8222-222222222222', '11111111-1111-1111-1111-111111111111', 'Vivek', '+919900000202', 'whatsapp', 'Do you have personal training?', 'ai_replied', true, true, null, now() - interval '12 hours', now() - interval '1 day'),
('bbbbbbb3-3333-4333-8333-333333333333', '11111111-1111-1111-1111-111111111111', 'Reshma', '+919900000203', 'walkin', 'Need ladies batch timings', 'followed_up', true, true, null, now() - interval '3 days', now() - interval '4 days'),
('bbbbbbb4-4444-4444-8444-444444444444', '11111111-1111-1111-1111-111111111111', 'Manu', '+919900000204', 'referral', 'Can I join from tomorrow?', 'converted', true, false, 'aaaaaaa3-3333-4333-8333-333333333333', now() - interval '2 days', now() - interval '5 days'),
('bbbbbbb5-5555-4555-8555-555555555555', '11111111-1111-1111-1111-111111111111', 'Ameen', '+919900000205', 'instagram_ad', 'Any discount this week?', 'cold', true, true, null, now() - interval '7 days', now() - interval '8 days');

-- 10 transactions (cash / counter_upi / razorpay_link)
insert into public.transactions (
  id, gym_id, member_id, amount, payment_mode, razorpay_payment_id,
  plan_purchased, logged_by, auto_logged, created_at
) values
('ccccccc1-1111-4111-8111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaa1-1111-4111-8111-111111111111', 1500.00, 'cash', null, 'bronze_1m', '55555555-5555-5555-5555-555555555555', false, now() - interval '9 days'),
('ccccccc2-2222-4222-8222-222222222222', '11111111-1111-1111-1111-111111111111', 'aaaaaaa2-2222-4222-8222-222222222222', 4500.00, 'counter_upi', null, 'silver_3m', '55555555-5555-5555-5555-555555555555', false, now() - interval '8 days'),
('ccccccc3-3333-4333-8333-333333333333', '11111111-1111-1111-1111-111111111111', 'aaaaaaa3-3333-4333-8333-333333333333', 1500.00, 'razorpay_link', 'pay_test_0003', 'bronze_1m', '44444444-4444-4444-4444-444444444444', true, now() - interval '7 days'),
('ccccccc4-4444-4444-8444-444444444444', '11111111-1111-1111-1111-111111111111', 'aaaaaaa5-5555-4555-8555-555555555555', 8000.00, 'razorpay_link', 'pay_test_0004', 'gold_6m', '44444444-4444-4444-4444-444444444444', true, now() - interval '6 days'),
('ccccccc5-5555-4555-8555-555555555555', '11111111-1111-1111-1111-111111111111', 'aaaaaaa7-7777-4777-8777-777777777777', 4500.00, 'cash', null, 'silver_3m', '55555555-5555-5555-5555-555555555555', false, now() - interval '5 days'),
('ccccccc6-6666-4666-8666-666666666666', '11111111-1111-1111-1111-111111111111', 'aaaaaaa8-8888-4888-8888-888888888888', 8000.00, 'counter_upi', null, 'gold_6m', '55555555-5555-5555-5555-555555555555', false, now() - interval '4 days'),
('ccccccc7-7777-4777-8777-777777777777', '11111111-1111-1111-1111-111111111111', 'aaaaaaab-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 4500.00, 'razorpay_link', 'pay_test_0007', 'silver_3m', '44444444-4444-4444-4444-444444444444', true, now() - interval '3 days'),
('ccccccc8-8888-4888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'aaaaaaae-eeee-4eee-8eee-eeeeeeeeeeee', 4500.00, 'cash', null, 'silver_3m', '55555555-5555-5555-5555-555555555555', false, now() - interval '2 days'),
('ccccccc9-9999-4999-8999-999999999999', '11111111-1111-1111-1111-111111111111', 'aaaaaab2-2222-4222-8222-222222222220', 8000.00, 'razorpay_link', 'pay_test_0009', 'gold_6m', '44444444-4444-4444-4444-444444444444', true, now() - interval '1 day'),
('ccccccca-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'aaaaaab5-5555-4555-8555-555555555550', 1500.00, 'counter_upi', null, 'bronze_1m', '55555555-5555-5555-5555-555555555555', false, now());
