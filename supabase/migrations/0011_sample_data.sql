-- "Load sample data" / "Clear sample data" (Settings page). Every row created here
-- is tagged is_sample = true so clearing can never touch the user's real records.

create or replace function seed_sample_data()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lead_open uuid;
  v_lead_contacted uuid;
  v_lead_negotiating uuid;
  v_lead_lost uuid;
  v_client_bakery uuid;
  v_client_gym uuid;
  v_client_clinic uuid;
  v_project_bakery uuid;
  v_project_gym uuid;
  v_dp_milestone uuid;
  v_mid_milestone uuid;
  v_final_milestone uuid;
  v_cr uuid;
  v_quotation uuid;
  v_invoice_dp uuid;
  v_invoice_mid uuid;
  v_invoice_gym uuid;
  v_product uuid;
begin
  -- Leads
  insert into leads (name, company, business_type, email, phone, preferred_contact, source, service_interested_in, estimated_value, stage, next_follow_up_date, notes, is_sample)
  values ('Maria Santos', 'Santos Pastries', 'restaurant', 'maria@santospastries.example', '+63 917 000 0001', 'Messenger', 'Referral', 'Website', 45000, 'New', current_date + 3, 'Wants a simple menu site with online ordering.', true)
  returning id into v_lead_open;

  insert into leads (name, company, business_type, email, phone, preferred_contact, source, service_interested_in, estimated_value, stage, next_follow_up_date, notes, is_sample)
  values ('Jun Reyes', 'Reyes Portfolio', 'other', 'jun@example.com', '+63 917 000 0002', 'Email', 'LinkedIn', 'Website', 15000, 'Contacted', current_date - 1, 'Freelance photographer, wants a portfolio site.', true)
  returning id into v_lead_contacted;

  insert into leads (name, company, business_type, email, phone, preferred_contact, source, service_interested_in, estimated_value, stage, next_follow_up_date, notes, is_sample)
  values ('Ana Cruz', 'Cruz Realty', 'real estate', 'ana@cruzrealty.example', '+63 917 000 0003', 'Viber', 'Facebook', 'Web app/System', 120000, 'Negotiating', current_date + 5, 'Needs a listings management system.', true)
  returning id into v_lead_negotiating;

  insert into leads (name, company, business_type, email, phone, preferred_contact, source, service_interested_in, estimated_value, stage, lost_reason, notes, is_sample)
  values ('Paolo Tan', 'Tan Retail', 'retail', 'paolo@example.com', '+63 917 000 0004', 'Phone', 'Cold outreach', 'E-commerce', 80000, 'Lost', 'Went with a cheaper offshore agency.', 'Followed up twice, price was the deciding factor.', true)
  returning id into v_lead_lost;

  -- Clients
  insert into clients (name, company, business_type, email, phone, preferred_contact, address, source, tags, notes, is_sample)
  values ('Liza Bakery', 'Sunrise Bakery', 'restaurant', 'liza@sunrisebakery.example', '+63 917 100 0001', 'Messenger', 'Quezon City, Philippines', 'Referral', array['bakery','ecommerce'], 'Great communicator, pays on time.', true)
  returning id into v_client_bakery;

  insert into clients (name, company, business_type, email, phone, preferred_contact, address, source, tags, notes, is_sample)
  values ('Carlo Mendoza', 'Metro Fitness Gym', 'gym', 'carlo@metrofitness.example', '+63 917 100 0002', 'Viber', 'Makati City, Philippines', 'Walk-in', array['gym','retainer'], 'Long-term maintenance client.', true)
  returning id into v_client_gym;

  insert into clients (name, company, business_type, email, phone, preferred_contact, address, source, tags, notes, is_sample)
  values ('Dr. Ramon Santos', 'Santos Clinic', 'clinic', 'ramon@santosclinic.example', '+63 917 100 0003', 'Email', 'Cebu City, Philippines', 'Referral', array['clinic','license'], 'Bought the appointment system outright.', true)
  returning id into v_client_clinic;

  -- Quotation (for a lead, still open)
  insert into quotations (client_id, lead_id, title, subtotal, total, issue_date, valid_until_date, terms, status, is_sample)
  values (null, v_lead_contacted, 'Portfolio Website Proposal', 15000, 15000, current_date - 5, current_date + 25, '50% downpayment, balance on delivery. Valid for 30 days.', 'Sent', true)
  returning id into v_quotation;

  insert into quotation_line_items (quotation_id, description, quantity, unit_price, line_total, sort_order)
  values
    (v_quotation, 'Portfolio website (up to 5 pages)', 1, 12000, 12000, 0),
    (v_quotation, 'Contact form integration', 1, 3000, 3000, 1);

  -- Project 1: Sunrise Bakery e-commerce site (in progress)
  insert into projects (client_id, title, description, project_type, pricing_model, base_price, status, start_date, deadline, tech_stack, live_url, hosting_provider, domain_registrar, notes, is_sample)
  values (v_client_bakery, 'Bakery E-commerce Website', 'Online ordering site with delivery scheduling.', 'E-commerce', 'Fixed price', 60000, 'In Progress', current_date - 30, current_date + 10, array['React','Supabase','Tailwind'], 'https://sunrisebakery.example', 'Vercel', 'Namecheap', 'Client prefers Messenger updates.', true)
  returning id into v_project_bakery;

  insert into milestones (project_id, title, amount, due_date, status, sort_order)
  values (v_project_bakery, 'Downpayment', 30000, current_date - 30, 'Paid', 0)
  returning id into v_dp_milestone;

  insert into milestones (project_id, title, amount, due_date, status, sort_order)
  values (v_project_bakery, 'Midpoint', 15000, current_date - 5, 'Paid', 1)
  returning id into v_mid_milestone;

  insert into milestones (project_id, title, amount, due_date, status, sort_order)
  values (v_project_bakery, 'Final Turnover', 15000, current_date + 10, 'Pending', 2)
  returning id into v_final_milestone;

  insert into change_requests (project_id, title, description, date_requested, requested_via, extra_charge, estimated_hours, status, date_completed)
  values (v_project_bakery, 'Add gift-wrapping option at checkout', 'Client asked for an extra checkbox and fee at checkout.', current_date - 8, 'Messenger', 3000, 4, 'Done', current_date - 6)
  returning id into v_cr;

  insert into time_logs (project_id, date, hours, description)
  values
    (v_project_bakery, current_date - 28, 8, 'Project setup and scaffolding'),
    (v_project_bakery, current_date - 20, 12, 'Storefront and product pages'),
    (v_project_bakery, current_date - 10, 10, 'Checkout and payments integration'),
    (v_project_bakery, current_date - 6, 4, 'Gift-wrapping change request');

  insert into invoices (client_id, project_id, subtotal, total, issue_date, due_date, status, is_sample)
  values (v_client_bakery, v_project_bakery, 30000, 30000, current_date - 30, current_date - 16, 'Paid', true)
  returning id into v_invoice_dp;

  insert into invoice_line_items (invoice_id, description, quantity, unit_price, line_total, source_milestone_id, sort_order)
  values (v_invoice_dp, 'Downpayment - Bakery E-commerce Website', 1, 30000, 30000, v_dp_milestone, 0);

  insert into invoices (client_id, project_id, subtotal, total, issue_date, due_date, status, is_sample)
  values (v_client_bakery, v_project_bakery, 15000, 15000, current_date - 5, current_date + 9, 'Paid', true)
  returning id into v_invoice_mid;

  insert into invoice_line_items (invoice_id, description, quantity, unit_price, line_total, source_milestone_id, sort_order)
  values (v_invoice_mid, 'Midpoint - Bakery E-commerce Website', 1, 15000, 15000, v_mid_milestone, 0);

  insert into payments (invoice_id, project_id, client_id, amount, date_paid, method, payment_type, reference_number, is_sample)
  values
    (v_invoice_dp, v_project_bakery, v_client_bakery, 30000, current_date - 29, 'GCash', 'Downpayment', 'GC-10021', true),
    (v_invoice_mid, v_project_bakery, v_client_bakery, 15000, current_date - 4, 'Bank transfer', 'Milestone', 'BT-88231', true);

  -- Project 2: Metro Fitness Gym membership system (completed)
  insert into projects (client_id, title, description, project_type, pricing_model, base_price, status, start_date, deadline, completion_date, warranty_end_date, tech_stack, live_url, hosting_provider, domain_registrar, notes, is_sample)
  values (v_client_gym, 'Membership Management System', 'Member check-in, billing, and class scheduling.', 'Web app/System', 'Fixed price', 90000, 'Completed', current_date - 120, current_date - 60, current_date - 58, current_date + 120, array['React','Supabase'], 'https://app.metrofitness.example', 'Hostinger', 'Hostinger', 'Now on a monthly maintenance retainer.', true)
  returning id into v_project_gym;

  insert into invoices (client_id, project_id, subtotal, total, issue_date, due_date, status, is_sample)
  values (v_client_gym, v_project_gym, 90000, 90000, current_date - 90, current_date - 76, 'Paid', true)
  returning id into v_invoice_gym;

  insert into invoice_line_items (invoice_id, description, quantity, unit_price, line_total, sort_order)
  values (v_invoice_gym, 'Membership Management System - full payment', 1, 90000, 90000, 0);

  insert into payments (invoice_id, project_id, client_id, amount, date_paid, method, payment_type, reference_number, is_sample)
  values (v_invoice_gym, v_project_gym, v_client_gym, 90000, current_date - 89, 'Bank transfer', 'Full payment', 'BT-77120', true);

  -- Recurring service for the gym
  insert into recurring_services (client_id, project_id, service_type, provider, description, amount_charged, my_cost, billing_cycle, next_renewal_date, auto_renew_on_provider, status, is_sample)
  values (v_client_gym, v_project_gym, 'Maintenance retainer', 'Self', 'Monthly maintenance and support retainer', 3500, 0, 'Monthly', current_date + 12, false, 'Active', true);

  insert into recurring_services (client_id, project_id, service_type, provider, description, amount_charged, my_cost, billing_cycle, next_renewal_date, auto_renew_on_provider, status, is_sample)
  values (v_client_bakery, v_project_bakery, 'Hosting', 'Vercel', 'sunrisebakery.example hosting', 800, 300, 'Monthly', current_date + 4, true, 'Active', true);

  -- Product + license for the clinic
  insert into products (name, description, current_version, standard_price, notes, is_sample)
  values ('Clinic Appointment System', 'Appointment booking and patient records for small clinics.', '2.3.0', 25000, 'Sold as a one-time license plus optional support.', true)
  returning id into v_product;

  insert into licenses (product_id, client_id, purchase_date, amount_paid, deployment_url, version_installed, support_until_date, status, notes, is_sample)
  values (v_product, v_client_clinic, current_date - 40, 25000, 'https://clinic.santosclinic.example', '2.3.0', current_date + 20, 'Active', 'Standard 60-day support window.', true);

  insert into payments (project_id, client_id, amount, date_paid, method, payment_type, reference_number, is_sample)
  values (null, v_client_clinic, 25000, current_date - 40, 'Maya', 'License', 'MY-55210', true);

  -- Expenses
  insert into expenses (date, category, amount, vendor, client_id, project_id, notes, is_sample)
  values
    (current_date - 25, 'Hosting', 800, 'Vercel', v_client_bakery, v_project_bakery, 'Monthly hosting for bakery site', true),
    (current_date - 60, 'Domain', 700, 'Namecheap', v_client_bakery, v_project_bakery, 'Annual domain renewal', true),
    (current_date - 15, 'Software/Subscription', 1200, 'Figma', null, null, 'Design tool subscription', true),
    (current_date - 5, 'Internet', 1500, 'PLDT', null, null, 'Monthly internet bill', true);
end;
$$;

create or replace function clear_sample_data()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from payments where is_sample = true;
  delete from invoices where is_sample = true;
  delete from recurring_services where is_sample = true;
  delete from licenses where is_sample = true;
  delete from products where is_sample = true;
  delete from expenses where is_sample = true;
  delete from projects where is_sample = true;
  delete from quotations where is_sample = true;
  delete from clients where is_sample = true;
  delete from leads where is_sample = true;
end;
$$;
