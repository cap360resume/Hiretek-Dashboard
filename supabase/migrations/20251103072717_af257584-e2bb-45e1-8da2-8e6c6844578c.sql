-- Make the resumes bucket public so files can be accessed via public URLs
UPDATE storage.buckets 
SET public = true 
WHERE id = 'resumes';