import importlib.util
import stat
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('extract', Path(__file__).parents[2] / 'scripts/pages/extract.py')
extract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extract)

HTML = '<!doctype html><html><head><title>Suite</title></head><body>ok</body></html>'
class ExtractionTest(unittest.TestCase):
    def run_archive(self, entries):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp)/'artifact.zip'
            with zipfile.ZipFile(archive, 'w') as z:
                for name, value in entries: z.writestr(name, value)
            dest=Path(tmp)/'out'
            extract.extract(archive, dest, 72, 'a'*40, '<script>')
            return {str(p.relative_to(dest)):p.read_text() for p in dest.rglob('*') if p.is_file()}
    def test_nested_pages_are_marked_and_title_escaped(self):
        out=self.run_archive([('index.html', HTML), ('acceptance/case/index.html', HTML), ('assets/app.js','ok')])
        self.assertIn('noindex,nofollow',out['acceptance/case/index.html'])
        self.assertIn('&lt;script&gt;',out['index.html'])
        self.assertEqual(out['assets/app.js'],'ok')
    def test_unsafe_paths_and_duplicate_entries_rejected(self):
        for path in ['../outside', 'pr-preview/pr-73/index.html', '.git/config', 'acceptance/%2e%2e/index.html', 'CNAME']:
            with self.subTest(path=path), self.assertRaises(ValueError): self.run_archive([('index.html',HTML),(path,HTML)])
        with self.assertRaises(ValueError): self.run_archive([('index.html',HTML),('index.html',HTML)])
    def test_symlink_and_special_modes_rejected(self):
        for mode in [stat.S_IFLNK | 0o777, stat.S_IFIFO | 0o644]:
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as tmp:
                archive = Path(tmp)/'artifact.zip'
                with zipfile.ZipFile(archive, 'w') as z:
                    z.writestr('index.html', HTML)
                    entry = zipfile.ZipInfo('assets/link')
                    entry.create_system = 3
                    entry.external_attr = mode << 16
                    z.writestr(entry, 'target')
                with self.assertRaises(ValueError): extract.extract(archive, Path(tmp)/'out', 72, 'a'*40)
    def test_missing_index_rejected(self):
        with self.assertRaises(ValueError): self.run_archive([('acceptance/a/index.html',HTML)])
if __name__ == '__main__': unittest.main()
