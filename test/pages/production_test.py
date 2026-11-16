import importlib.util
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('production',Path(__file__).parents[2]/'scripts/pages/production.py')
production=importlib.util.module_from_spec(spec); spec.loader.exec_module(production)

class ProductionTest(unittest.TestCase):
    def test_combines_new_root_and_verified_old_preview_with_new_receipt(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp); old=base/'old'; old.mkdir(); (old/'index.html').write_text('old')
            (old/'pr-preview/pr-12').mkdir(parents=True); (old/'pr-preview/pr-12/index.html').write_text('preview')
            new=base/'new'; new.mkdir(); (new/'index.html').write_text('new')
            out=base/'out'; receipt=production.prepare(new,out,'a'*40,12,1,'b'*32,old,previous='c'*32)
            self.assertEqual((out/'index.html').read_text(),'new')
            self.assertEqual((out/'pr-preview/pr-12/index.html').read_text(),'preview')
            self.assertEqual(receipt['run'],12)
            self.assertEqual(receipt['previous'],'c'*32)
    def test_no_baseline_requires_explicit_legacy_permission(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp); new=base/'new'; new.mkdir(); (new/'index.html').write_text('new')
            with self.assertRaises(ValueError): production.prepare(new,base/'out','a'*40,12,1,'b'*32,None)
            self.assertEqual(production.prepare(new,base/'out2','a'*40,12,1,'b'*32,None,legacy=True)['run'],12)
    def test_legacy_root_cannot_define_preview_namespace(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp); new=base/'new'; new.mkdir(); (new/'index.html').write_text('new'); (new/'pr-preview').mkdir()
            with self.assertRaises(ValueError): production.prepare(new,base/'out','a'*40,12,1,'b'*32,None,legacy=True)
if __name__=='__main__': unittest.main()
