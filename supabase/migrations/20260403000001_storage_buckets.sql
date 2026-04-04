-- Storage buckets for SGVAQ
INSERT INTO storage.buckets (id, name, public) VALUES
  ('comprovantes', 'comprovantes', false),
  ('logos', 'logos', true),
  ('banners', 'banners', true),
  ('pdfs', 'pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for comprovantes bucket (private)
CREATE POLICY "Tenant members can upload comprovantes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'comprovantes'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Tenant financeiro can read comprovantes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'comprovantes'
  AND auth.role() = 'authenticated'
);

-- RLS policies for logos bucket (public read)
CREATE POLICY "Anyone can read logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Tenant organizador can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos'
  AND auth.role() = 'authenticated'
);

-- RLS policies for banners bucket (public read)
CREATE POLICY "Anyone can read banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

CREATE POLICY "Tenant organizador can upload banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'banners'
  AND auth.role() = 'authenticated'
);

-- RLS policies for pdfs bucket (private)
CREATE POLICY "Tenant members can read pdfs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pdfs'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Tenant members can upload pdfs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pdfs'
  AND auth.role() = 'authenticated'
);
