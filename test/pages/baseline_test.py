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
            combined=baseline.digest(root, include_previews=True)
            (root/'pr-preview/pr-1/index.html').write_text('changed')
            self.assertNotEqual(combined,baseline.digest(root, include_previews=True))
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


class StageTest(unittest.TestCase):
    def test_stage_copies_only_public_files_and_writes_receipt(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'source'; root.mkdir(); (root/'index.html').write_text('published')
            (root/'.private').write_text('not published')
            (root/'assets').mkdir(); (root/'assets/site.css').write_text('style')
            dest=Path(tmp)/'staged'
            baseline.stage(root,dest,'a'*40,42,1,'b'*32)
            self.assertFalse((dest/'.private').exists())
            self.assertEqual((dest/'assets/site.css').read_text(),'style')
            import json
            receipt=json.loads((dest/baseline.RECEIPT).read_text())
            self.assertEqual(receipt['root'],baseline.digest(dest))
            self.assertEqual(receipt['snapshot'],baseline.digest(dest, include_previews=True))
    def test_stage_rejects_existing_destination_and_links(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'source'; root.mkdir(); (root/'index.html').write_text('published')
            dest=Path(tmp)/'staged'; dest.mkdir()
            with self.assertRaises(ValueError): baseline.stage(root,dest,'a'*40,42,1,'b'*32)
            dest.rmdir(); (root/'link').symlink_to('index.html')
            with self.assertRaises(ValueError): baseline.stage(root,dest,'a'*40,42,1,'b'*32)


class MergeTest(unittest.TestCase):
    def test_production_merge_preserves_all_preview_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            old=Path(tmp)/'old'; old.mkdir(); (old/'index.html').write_text('old')
            (old/'pr-preview/pr-1').mkdir(parents=True); (old/'pr-preview/pr-1/index.html').write_bytes(b'one')
            (old/'pr-preview/pr-2').mkdir(); (old/'pr-preview/pr-2/index.html').write_bytes(b'two')
            new=Path(tmp)/'new'; new.mkdir(); (new/'index.html').write_text('new')
            out=Path(tmp)/'combined'; baseline.merge_production(old,new,out)
            self.assertEqual((out/'index.html').read_text(),'new')
            self.assertEqual((out/'pr-preview/pr-1/index.html').read_bytes(),b'one')
            self.assertEqual((out/'pr-preview/pr-2/index.html').read_bytes(),b'two')
    def test_production_cannot_supply_preview_namespace(self):
        with tempfile.TemporaryDirectory() as tmp:
            old=Path(tmp)/'old'; old.mkdir(); (old/'index.html').write_text('old')
            new=Path(tmp)/'new'; new.mkdir(); (new/'index.html').write_text('new'); (new/'pr-preview').mkdir()
            with self.assertRaises(ValueError): baseline.merge_production(old,new,Path(tmp)/'out')

if __name__=='__main__': unittest.main()
