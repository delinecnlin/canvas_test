import Link from 'next/link';
import { useTranslation } from "react-i18next";

const Item = ({ data = null, isLoading = false }) => {
  const { t } = useTranslation();
  return isLoading ? (
    <div className="h-6 mb-3 bg-gray-600 rounded animate-pulse" />
  ) : (
    <li>
      <Link href={data.path} className="text-gray-300 hover:text-white">
        {t(data.name)}
      </Link>
    </li>
  );
};

export default Item;
