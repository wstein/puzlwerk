import importlib.util, io, json, tarfile, tempfile, unittest, zipfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('bootstrap',Path(__file__).parents[2]/'scripts/pages/bootstrap.py')
bootstrap=importlib.util.module_from_spec(spec); spec.loader.exec_module(bootstrap)
class BootstrapTest(unittest.TestCase):
 def archive(self,root,name='index.html'):
  raw=io.BytesIO()
  with tarfile.open(fileobj=raw,mode='w') as t:
   item=tarfile.TarInfo(name); data=b'old root'; item.size=len(data); t.addfile(item,io.BytesIO(data))
  path=root/'artifact.zip'
  with zipfile.ZipFile(path,'w') as z:z.writestr('artifact.tar',raw.getvalue())
  return path
 def test_verified_archive_becomes_initial_receipt(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp); archive=self.archive(root); source=root/'source'; source.mkdir(); (source/'index.html').write_bytes(b'old root')
   expected=bootstrap.baseline.digest(source); full=bootstrap.baseline.digest(source,include_previews=True)
   receipt=bootstrap.assemble(archive,root/'out',expected,full,'a'*40,44,1,'b'*32)
   self.assertEqual(receipt['root'],expected); self.assertEqual(receipt['snapshot'],full); self.assertIsNone(receipt['previous'])
 def test_hash_mismatch_and_traversal_fail(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp); archive=self.archive(root)
   source=root/'source'; source.mkdir(); (source/'index.html').write_bytes(b'old root')
   full=bootstrap.baseline.digest(source,include_previews=True)
   with self.assertRaises(ValueError): bootstrap.assemble(archive,root/'out','0'*64,full,'a'*40,44,1,'b'*32)
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp); archive=self.archive(root,'../outside')
   with self.assertRaises(ValueError): bootstrap.assemble(archive,root/'out','0'*64,'0'*64,'a'*40,44,1,'b'*32)
if __name__=='__main__': unittest.main()
