# Testing Guide - Inform v2 MVP

## Prerequisites

1. **Start the development server:**
   ```bash
   pnpm dev
   ```
   The app should be available at http://localhost:3000

2. **Verify database is running:**
   ```bash
   docker ps
   ```
   You should see `inform-v2-db-1` and `inform-v2-redis-1` containers running.

## Test Credentials

From the seed data:
- **Super Admin:** `admin@iterate.ai` / `changeme123`
- **Org Admin:** `admin@acme.com` / `password123`
- **Reviewer:** `reviewer@acme.com` / `password123`

## Test Scenarios

### 1. Authentication & Login ✅

**Test the login flow:**

1. Navigate to http://localhost:3000
2. You should be redirected to `/login`
3. Try logging in with:
   - Email: `admin@iterate.ai`
   - Password: `changeme123`
4. **Expected:** You should be redirected to `/dashboard`
5. **Verify:** You see the dashboard with metrics

**Test logout:**
1. Click on your email in the top-right corner
2. Click "Log out"
3. **Expected:** You're redirected back to `/login`

---

### 2. Dashboard ✅

**Test dashboard metrics:**

1. Login as `admin@iterate.ai`
2. Navigate to http://localhost:3000/dashboard
3. **Expected:** You should see:
   - Total Submissions count
   - Graded count and percentage
   - Organizations count
   - Recent submissions list
   - Quick action buttons

---

### 3. Forms Management ✅

**Test viewing forms:**

1. Navigate to http://localhost:3000/forms
2. **Expected:** You should see the seeded form "Innovation Challenge 2025"
3. You should see columns: Name, Organization, Status, Submissions, Created, Actions

**Test creating a new form:**

1. Click "Create Form" button
2. **Form Fields Tab:**
   - Add a form title: "Test Form"
   - Add description: "This is a test form"
   - Click "Add Field"
   - Configure field:
     - Type: Text
     - Label: "Company Name"
     - Required: ✓
   - Add another field:
     - Type: Textarea
     - Label: "Description"
     - Required: ✓
3. **Rubric Tab:**
   - Click "Add Question"
   - Label: "Quality"
   - Weight: 0.5
   - Required: ✓
   - Add another question:
     - Label: "Feasibility"
     - Weight: 0.5
     - Required: ✓
   - **Verify:** Weight distribution shows 1.00 (balanced)
4. **Settings Tab:**
   - Form Name: "Test Form"
   - Slug: "test-form"
   - Status: Draft
   - Min Reviews Required: 2
   - Visibility Mode: "Reveal After I Submit"
5. **Preview Tab:**
   - **Expected:** See live preview of form fields and rubric
6. Click "Save Form"
7. **Expected:** Form is saved, you're redirected to edit page

**Test publishing a form:**

1. On the form edit page, ensure you have at least one field and one rubric question
2. Click "Publish Form"
3. **Expected:** Success toast appears, form status may change to "open"

---

### 4. Public Form Submission ✅

**Test public form access:**

1. Note the org slug and form slug from your form (check the seeded form: org="acme", form="innovation-challenge")
2. Navigate to: http://localhost:3000/acme/innovation-challenge
3. **Expected:** You should see the public form page with fields from the seeded form

**Test form submission:**

1. Fill out the form:
   - Email: `test@example.com`
   - Company Name: "Test Company"
   - Idea: "A great test idea"
   - Website: "https://example.com"
2. Complete CAPTCHA (if configured, or skip in dev mode)
3. Click "Submit"
4. **Expected:** 
   - Redirected to success page
   - Success message displayed
5. Go back to dashboard
6. **Expected:** Submission count increased

---

### 5. Submissions List ✅

**Test viewing submissions:**

1. Navigate to http://localhost:3000/submissions
2. **Expected:** 
   - See filter panel
   - "Please select a form to view submissions" message
3. Select a form from the dropdown (e.g., "Innovation Challenge 2025")
4. **Expected:**
   - Submissions table appears
   - Shows columns: Email, Submitted, Status, Reviews, Score, Tags, Actions
   - Your test submission appears in the list

**Test filtering:**

1. Select a form
2. Change status filter to "Ungraded"
3. **Expected:** Only ungraded submissions shown
4. Try searching by email: enter "test@example.com"
5. **Expected:** Only matching submissions shown

**Test export:**

1. Select a form with submissions
2. Click "Export CSV"
3. **Expected:** CSV file downloads with submission data

---

### 6. Submission Detail & Review ✅

**Test viewing submission details:**

1. From submissions list, click "View" on a submission
2. **Expected:** 
   - See submission detail page
   - Shows submission metadata (email, date, status)
   - Shows submission data fields
   - Shows review form section
   - Shows tags section

**Test submitting a review:**

1. Scroll to "Submit Review" section
2. For each rubric question:
   - Use the slider to set a score (1-5)
   - Or see the score update as you move the slider
3. Add a comment: "This looks good!"
4. Click "Save Draft"
5. **Expected:** Success toast, draft saved
6. Modify scores, then click "Submit Review"
7. **Expected:**
   - Success toast
   - Page refreshes
   - Your review appears in "My Review" section
   - Status may change (ungraded → partially_graded)

**Test review visibility:**

1. As a reviewer, submit a review
2. **Expected:** After submitting, you can see "Other Reviews" section (if policy allows)
3. Logout and login as another reviewer (`reviewer@acme.com`)
4. View the same submission
5. **Expected:** 
   - You can see your own review form
   - "Other Reviews" shows the previous reviewer's review (if visibility policy allows)
   - After you submit, you can see others' reviews

---

### 7. Review Queue ✅

**Test review queue:**

1. Login as `reviewer@acme.com`
2. Navigate to http://localhost:3000/review-queue
3. **Expected:**
   - See list of submissions you haven't reviewed yet
   - Shows: Form, Submitter, Submitted, Reviews, Action
   - Sorted by least-reviewed first
4. Click "Review" on a submission
5. **Expected:** Redirected to submission detail page

---

### 8. Form Builder Advanced Features ✅

**Test field types:**

1. Create/edit a form
2. In Form Fields tab, test adding different field types:
   - Text
   - Textarea
   - Email
   - URL
   - Number (with min/max validation)
   - Select (add multiple options)
   - Radio (add multiple options)
3. **Expected:** Each field type renders correctly in preview

**Test field reordering:**

1. Add multiple fields
2. Use the grip icon to reorder fields
3. **Expected:** Fields reorder correctly

**Test rubric weight validation:**

1. In Rubric tab, add questions with weights that don't sum to 1.0
2. **Expected:** Warning appears, weight distribution shows imbalance
3. Adjust weights to sum to 1.0
4. **Expected:** Warning disappears, shows "✓ Balanced"

---

## Common Issues & Troubleshooting

### Issue: "Cannot connect to database"
**Solution:**
```bash
# Check if containers are running
docker ps

# If not running, start them
pnpm db:up

# Verify connection
pnpm db:studio
```

### Issue: "Form not found" when accessing public form
**Solution:**
- Check that the form is published (has a published FormVersion)
- Verify org slug and form slug match exactly
- Check form status is "open"

### Issue: "Cannot see other reviews"
**Solution:**
- Verify visibility policy settings on the form
- Ensure you've submitted your own review first (for REVEAL_AFTER_ME_SUBMIT)
- Check that minimum reviews threshold is met (for REVEAL_AFTER_MIN_REVIEWS)

### Issue: Review form not saving
**Solution:**
- Check browser console for errors
- Verify all required rubric questions have scores
- Ensure scores are within scale range (min-max)

### Issue: Export CSV not working
**Solution:**
- Ensure form has published versions
- Check that form has submissions
- Verify you're logged in as org_admin

---

## Test Checklist

Use this checklist to verify all features:

- [ ] Login with super admin credentials
- [ ] Login with org admin credentials
- [ ] Login with reviewer credentials
- [ ] Logout works
- [ ] Dashboard shows metrics
- [ ] Forms list displays correctly
- [ ] Create new form with multiple fields
- [ ] Create rubric with multiple questions
- [ ] Publish form successfully
- [ ] Access public form URL
- [ ] Submit public form
- [ ] View submissions list
- [ ] Filter submissions by form/status/email
- [ ] Export submissions as CSV
- [ ] View submission detail page
- [ ] Submit review (save draft first)
- [ ] Submit review (final submission)
- [ ] See own review after submission
- [ ] See other reviews (after visibility policy allows)
- [ ] Review queue shows ungraded submissions
- [ ] Form builder preview works
- [ ] Field reordering works
- [ ] Rubric weight validation works

---

## Next Steps After Testing

If everything works:

1. **Create a complete workflow test:**
   - Create a new form from scratch
   - Publish it
   - Submit multiple test submissions
   - Review them as different users
   - Export the data

2. **Test edge cases:**
   - Form with no fields (should warn)
   - Form with no rubric questions (should warn)
   - Submission with invalid data
   - Review with missing required scores

3. **Performance testing:**
   - Create form with many fields (10+)
   - Create rubric with many questions (10+)
   - View submissions list with many items
   - Export large dataset

4. **Multi-user testing:**
   - Login as different users simultaneously (different browsers/incognito)
   - Test visibility policies with multiple reviewers
   - Verify org isolation (users from different orgs can't see each other's data)

---

## Quick Test Commands

```bash
# Start everything
pnpm db:up    # Start database
pnpm dev      # Start dev server

# Reset database (if needed)
pnpm db:reset

# View database in browser
pnpm db:studio

# Check logs
docker logs inform-v2-db-1
docker logs inform-v2-redis-1
```

