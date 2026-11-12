"""Pruebas estáticas del contrato OAuth/Android de Matick Nube.

No requieren modelo GGUF ni publican secretos. No reemplazan un despliegue E2E.
"""
import ast
import pathlib
import unittest

SERVER = pathlib.Path(__file__).resolve().parents[1] / "huggingface" / "app.py"

class OAuthContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = SERVER.read_text(encoding="utf-8")
        cls.tree = ast.parse(cls.source, filename=str(SERVER))

    def test_required_fastapi_routes(self):
        endpoints = {}
        for node in ast.walk(self.tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for decor in node.decorator_list:
                if isinstance(decor, ast.Call) and isinstance(decor.func, ast.Attribute):
                    if decor.args and isinstance(decor.args[0], ast.Constant):
                        endpoints[(decor.func.attr, decor.args[0].value)] = node.name
        self.assertIn(("get", "/.well-known/oauth-cimd"), endpoints)
        self.assertIn(("get", "/api/cuenta"), endpoints)
        self.assertIn(("get", "/api/estado"), endpoints)
        self.assertIn(("post", "/api/chat"), endpoints)

    def test_public_client_and_mobile_callback(self):
        self.assertIn("morletreloj://oauth/callback", self.source)
        self.assertIn('"token_endpoint_auth_method": "none"', self.source)
        self.assertIn('"code_challenge_methods_supported": ["S256"]', self.source)
        self.assertIn('"/.well-known/oauth-cimd"', self.source)

    def test_account_requires_hf_verification_and_optional_chat(self):
        self.assertIn("https://huggingface.co/oauth/userinfo", self.source)
        self.assertIn("Authorization", self.source)
        self.assertIn('perfil = _cuenta_de_huggingface(authorization) if authorization else None', self.source)
        self.assertIn('{"conectada": True', self.source)
        self.assertIn('"Cache-Control": "no-store"', self.source)


if __name__ == "__main__":
    unittest.main()
