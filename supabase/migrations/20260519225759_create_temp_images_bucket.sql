/*
  # Create temp.images storage bucket

  Creates a public storage bucket named "temp.images" for storing
  salon service reference images.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('temp.images', 'temp.images', true)
ON CONFLICT (id) DO NOTHING;
