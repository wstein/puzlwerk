import importlib.util
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('baseline',Path(__file__).parents[2]/'scripts/pages/baseline.py')
baseline=importlib.util.module_from_spec(spec)
spec.loader.exec_module(baseline)

class BaselineTest(unittest.TestCase):
    def test_production_hash_ignores_only_preview_namespace_and_receipt(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); (root/'index.html').write_text('published'); (root/'asset.js').write_text('v1')
            first=baseline.digest(root)
            (root/'pr-preview/pr-1').mkdir(parents=True); (root/'pr-preview/pr-1/index.html').write_text('preview')
            (root/'.puzlwerk-publication.json').write_text('receipt')
            self.assertEqual(first,baseline.digest(root))
            (root/'asset.js').write_text('v2'); self.assertNotEqual(first,baseline.digest(root))
    def test_incomplete_or_unsafe_snapshot_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            with self.assertRaises(ValueError): baseline.digest(root)
            (root/'index.html').write_text('root')
            (root/'link').symlink_to('index.html')
            with self.assertRaises(ValueError): baseline.digest(root)

class ReceiptTest(unittest.TestCase):
    def test_receipt_binds_tree_to_dispatch_identity(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); (root/'index.html').write_text('production')
            receipt=baseline.make_receipt(root, 'a'*40, 12, 2, 'b'*32)
            self.assertEqual(receipt['root'],baseline.digest(root))
            self.assertEqual(receipt['run'],12)
            self.assertEqual(receipt['attempt'],2)
            self.assertEqual(receipt['sha'],'a'*40)
            for args in [('bad',12,2,'b'*32),('a'*40,0,2,'b'*32),('a'*40,12,0,'b'*32),('a'*40,12,2,'bad')]:
                with self.assertRaises(ValueError): baseline.make_receipt(root,*args)

if __name__=='__main__': unittest.main()
