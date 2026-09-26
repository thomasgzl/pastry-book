-- Autorise l'import manuel d'une photo JPEG comme illustration
-- (visual_assets.image_url) -- jusqu'ici le bucket visual-assets n'acceptait
-- que PNG/WebP (formats renvoyes par la generation IA, 20260814090300).
-- JPEG est le format le plus courant depuis un telephone/tablette (camera,
-- galerie) -- le seul format d'import manuel realiste sans conversion.

update storage.buckets
set allowed_mime_types = array['image/png', 'image/webp', 'image/jpeg']
where id = 'visual-assets';
